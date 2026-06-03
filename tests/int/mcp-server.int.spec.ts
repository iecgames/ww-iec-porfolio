/**
 * Integration tests for the MCP Server tools.
 *
 * Uses @modelcontextprotocol/sdk InMemoryTransport to connect an MCP Client
 * directly to the server in-process (no HTTP layer), against a real Payload
 * + MongoDB instance.
 *
 * Test order matters:
 *   jobs_list → jobs_create → jobs_get → jobs_update → jobs_delete
 *
 * Any job created during the test run is cleaned up in afterAll.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createMcpServer } from '@/mcp/server.js'
import config from '@/payload.config'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Bootstrap a linked MCP Client ↔ Server pair using the real Payload instance. */
async function buildClient(payload: Payload): Promise<Client> {
  const server = createMcpServer(payload)
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  const client = new Client({ name: 'vitest-mcp-client', version: '1.0.0' })
  await client.connect(clientTransport)
  return client
}

/** Extract the first text content from a tool result. */
function getText(result: Awaited<ReturnType<Client['callTool']>>): string {
  const first = result.content[0]
  if (!first || first.type !== 'text') throw new Error('Expected text content in tool result')
  return first.text as string
}

/**
 * Parse JSON from the first text content of a tool result.
 *
 * Several tools append a human-readable links block (`Status: … / Admin: … /
 * Preview URL: …`) after the JSON document, separated by a blank line. Pretty-
 * printed JSON never contains a blank line, so we parse only the leading block
 * up to the first `\n\n`.
 */
function getJSON<T = unknown>(result: Awaited<ReturnType<Client['callTool']>>): T {
  const [jsonBlock] = getText(result).split('\n\n')
  return JSON.parse(jsonBlock!) as T
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TEST_JOB = {
  locale: 'en' as const,
  title: '[TEST] MCP Integration Engineer',
  department: '__mcp_test_dept__',
  location: 'Hanoi, Vietnam',
  employmentType: 'fullTime' as const,
  workingHours: '9AM – 6PM, Mon–Fri',
  salaryLabel: 'Competitive',
  description: 'Test job created by automated MCP integration tests.',
  jobDescription:
    '## Responsibilities\nBuild and maintain MCP integrations.\n---\n**Collaborate** with the team.',
  qualifications:
    '### Requirements\n**3+ years** TypeScript experience.\nStrong problem-solving skills.',
  benefits: '- Health insurance\n- Annual performance bonus\n- 15 days annual leave',
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('MCP Server — Jobs Tools', () => {
  let payload: Payload
  let client: Client
  let createdJobId: string

  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
    client = await buildClient(payload)
  })

  afterAll(async () => {
    // Best-effort cleanup: delete the test job if it wasn't removed by the delete test
    if (createdJobId) {
      try {
        await payload.delete({ collection: 'jobs', id: createdJobId })
      } catch {
        // Already deleted or not found — ignore
      }
    }
  })

  // ── jobs_list ──────────────────────────────────────────────────────────────

  describe('jobs_list', () => {
    it('returns an object with total and items', async () => {
      const result = await client.callTool({ name: 'jobs_list', arguments: { locale: 'en' } })
      expect(result.isError).toBeFalsy()
      const data = getJSON<{ total: number; items: unknown[] }>(result)
      expect(typeof data.total).toBe('number')
      expect(Array.isArray(data.items)).toBe(true)
    })

    it('respects the limit parameter', async () => {
      const result = await client.callTool({ name: 'jobs_list', arguments: { limit: 1 } })
      const data = getJSON<{ items: unknown[] }>(result)
      expect(data.items.length).toBeLessThanOrEqual(1)
    })

    it('filters by department (no match expected for sentinel value)', async () => {
      const result = await client.callTool({
        name: 'jobs_list',
        arguments: { department: '__nonexistent_dept_xyz__' },
      })
      const data = getJSON<{ total: number; items: unknown[] }>(result)
      expect(data.total).toBe(0)
      expect(data.items).toHaveLength(0)
    })

    it('returns jobs for locale=vi without error', async () => {
      const result = await client.callTool({ name: 'jobs_list', arguments: { locale: 'vi' } })
      expect(result.isError).toBeFalsy()
      const data = getJSON<{ items: unknown[] }>(result)
      expect(Array.isArray(data.items)).toBe(true)
    })
  })

  // ── jobs_create ────────────────────────────────────────────────────────────

  describe('jobs_create', () => {
    it('creates a new job and returns its id + content', async () => {
      const result = await client.callTool({ name: 'jobs_create', arguments: TEST_JOB })
      expect(result.isError).toBeFalsy()
      const text = getText(result)
      expect(text).toContain(TEST_JOB.title)
      expect(text).toContain('id')

      // Capture the created ID for subsequent tests
      const idMatch = text.match(/"id":\s*"([^"]+)"/)
      expect(idMatch).not.toBeNull()
      createdJobId = idMatch![1]!
      expect(createdJobId).toBeTruthy()
    })

    it('sets _status to draft (new bilingual workflow)', async () => {
      const result = await client.callTool({ name: 'jobs_create', arguments: TEST_JOB })
      const text = getText(result)
      const idMatch = text.match(/"id":\s*"([^"]+)"/)
      const extraId = idMatch![1]!

      // Verify via direct Payload lookup — must include drafts
      const doc = await payload.findByID({
        collection: 'jobs',
        id: extraId,
        depth: 0,
        draft: true,
        overrideAccess: true,
      })
      expect((doc as unknown as Record<string, unknown>)['_status']).toBe('draft')

      // Response should include preview URL + next-step guidance
      expect(text).toContain('Preview URL (draft)')
      expect(text).toContain('NEXT STEPS')

      // Clean up this extra job
      await payload.delete({ collection: 'jobs', id: extraId })
    })

    it('jobs_publish flips draft → published', async () => {
      // Create a fresh draft to publish
      const created = await client.callTool({ name: 'jobs_create', arguments: TEST_JOB })
      const idMatch = getText(created).match(/"id":\s*"([^"]+)"/)
      const draftId = idMatch![1]!

      const published = await client.callTool({
        name: 'jobs_publish',
        arguments: { id: draftId },
      })
      expect(published.isError).toBeFalsy()
      expect(getText(published)).toContain('Public URL')

      const doc = await payload.findByID({
        collection: 'jobs',
        id: draftId,
        depth: 0,
        overrideAccess: true,
      })
      expect((doc as unknown as Record<string, unknown>)['_status']).toBe('published')

      await payload.delete({ collection: 'jobs', id: draftId })
    })
  })

  // ── jobs_get ───────────────────────────────────────────────────────────────

  describe('jobs_get', () => {
    it('retrieves the created job by ID', async () => {
      const result = await client.callTool({
        name: 'jobs_get',
        arguments: { id: createdJobId, locale: 'en' },
      })
      expect(result.isError).toBeFalsy()
      const doc = getJSON<Record<string, unknown>>(result)
      expect(doc['id']).toBe(createdJobId)
      expect(doc['title']).toBe(TEST_JOB.title)
      expect(doc['department']).toBe(TEST_JOB.department)
      expect(doc['location']).toBe(TEST_JOB.location)
    })

    it('returns an error result for a non-existent ID', async () => {
      const result = await client.callTool({
        name: 'jobs_get',
        arguments: { id: '000000000000000000000000', locale: 'en' },
      })
      // MCP tools return isError:true for handler exceptions (not JSON-RPC errors)
      expect(result.isError).toBe(true)
    })
  })

  // ── jobs_update ────────────────────────────────────────────────────────────

  describe('jobs_update', () => {
    it('updates the title and salaryLabel of the created job', async () => {
      const result = await client.callTool({
        name: 'jobs_update',
        arguments: {
          id: createdJobId,
          locale: 'en',
          title: '[TEST] Updated MCP Engineer',
          salaryLabel: '$80k–$120k',
        },
      })
      expect(result.isError).toBeFalsy()
      const text = getText(result)
      expect(text).toContain('[TEST] Updated MCP Engineer')
      expect(text).toContain('$80k–$120k')
    })

    it('does not wipe out unspecified fields', async () => {
      const result = await client.callTool({
        name: 'jobs_get',
        arguments: { id: createdJobId, locale: 'en' },
      })
      const doc = getJSON<Record<string, unknown>>(result)
      // department and location should still be intact after the partial update
      expect(doc['department']).toBe(TEST_JOB.department)
      expect(doc['location']).toBe(TEST_JOB.location)
    })

    it('updates richText field (jobDescription) via markdown', async () => {
      const result = await client.callTool({
        name: 'jobs_update',
        arguments: {
          id: createdJobId,
          locale: 'en',
          jobDescription:
            '## Updated Role\nNew responsibilities.\n---\n**Key task**: deliver results.',
        },
      })
      expect(result.isError).toBeFalsy()
      const text = getText(result)
      expect(text).toContain(createdJobId)
    })
  })

  // ── jobs_delete ────────────────────────────────────────────────────────────

  describe('jobs_delete', () => {
    it('deletes the created job and returns a confirmation', async () => {
      const result = await client.callTool({
        name: 'jobs_delete',
        arguments: { id: createdJobId },
      })
      expect(result.isError).toBeFalsy()
      const text = getText(result)
      expect(text).toContain(createdJobId)

      // Mark as deleted so afterAll cleanup is skipped
      createdJobId = ''
    })

    it('confirms the job no longer exists in the database', async () => {
      // Re-create a fresh client because the server state is per-call
      const freshClient = await buildClient(payload)
      const result = await freshClient.callTool({
        name: 'jobs_get',
        arguments: { id: '000000000000000000000000', locale: 'en' },
      })
      expect(result.isError).toBe(true)
    })
  })
})
