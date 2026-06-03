/**
 * MCP Server factory.
 *
 * Call `createMcpServer(payload)` to get a configured `McpServer` instance
 * with all tools registered. The `instructions` field is sent in the
 * `initialize` response and clients (Claude / Cursor / Cline / etc.) load it
 * as system-level guidance — this is how we encode workflow rules that no
 * individual tool description can express on its own.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Payload } from 'payload'
import { z } from 'zod'

import { registerApplicationTools } from './tools/applications'
import { registerJobTools } from './tools/jobs'
import { registerMediaTools } from './tools/media'
import { registerPostTools } from './tools/posts'

const SERVER_NAME = 'iec-payload-mcp'
const SERVER_VERSION = '2.2.0'

const SERVER_INSTRUCTIONS = `IEC Games — Payload CMS MCP Server (version ${SERVER_VERSION}).

If the user asks which version of this MCP server / IEC CMS MCP is running,
answer "${SERVER_VERSION}" (or call the server_info tool to confirm).

This server exposes tools to manage these domains in the IEC Payload CMS:
  • Jobs (bilingual job postings)
  • Posts (bilingual blog posts)
  • Media (image library: list / upload images for hero + SEO images)
  • Applications (read-only HR view of CV submissions)

═══════════════════════════════════════════════════════════════════════════
WORKFLOW RULES — apply to ALL create/update operations
═══════════════════════════════════════════════════════════════════════════

1. DRAFTS BY DEFAULT
   • jobs_create and posts_create ALWAYS produce a DRAFT (not public).
   • Never assume the user wants to publish immediately.

2. PREVIEW BEFORE PUBLISH
   • After every create/update, show the returned preview URL to the user.
   • The preview URL works in the user's browser because they are logged into
     the Payload admin in that same browser.

3. EXPLICIT CONFIRMATION REQUIRED TO PUBLISH
   • After showing the preview, ask the user a clear yes/no question:
       "Bạn có muốn xuất bản (publish) bài viết / công việc này không?"
   • Only call jobs_publish / posts_publish AFTER the user explicitly confirms.
   • If the user wants changes first, call the corresponding _update tool and
     show the new preview URL again.

4. ASK ABOUT NOTIFY / BROADCAST BEFORE PUBLISHING
   • Publishing for the FIRST time can broadcast a promotional email to ALL
     subscribers (controlled by the "notifySubscribers" field, default true).
   • After the user confirms they want to publish, ask a second yes/no question
     BEFORE calling the _publish tool:
       "Bạn có muốn gửi thông báo (notify/broadcast) tới subscribers khi xuất bản không?"
   • If the user says NO, first call jobs_update / posts_update with
     notifySubscribers=false, THEN call _publish.
   • If the user says YES (or it's already the desired default), proceed to
     _publish directly — the broadcast is sent automatically on first publish.

═══════════════════════════════════════════════════════════════════════════
JOBS-SPECIFIC RULES
═══════════════════════════════════════════════════════════════════════════

  • Jobs are BILINGUAL. Every job MUST have both an English (locale="en") and
    a Vietnamese (locale="vi") version.
  • Standard flow:
      1. jobs_create(locale="en", ...)            → returns id (draft)
      2. jobs_update(id=<id>, locale="vi", ...)   → adds Vietnamese version
      3. Show preview URL, ask user → jobs_publish(id=<id>) on confirmation
  • If only one language is provided by the user, ask whether they want help
    translating before creating. Do not silently leave a locale empty.

═══════════════════════════════════════════════════════════════════════════
POSTS-SPECIFIC RULES
═══════════════════════════════════════════════════════════════════════════

  • Posts are BILINGUAL. Title, content, and SEO meta are localized; every post
    SHOULD have both an English (locale="en") and a Vietnamese (locale="vi")
    version.
  • Standard flow:
      1. posts_create(locale="en", ...)            → returns id (draft)
      2. posts_update(id=<id>, locale="vi", ...)   → adds Vietnamese version
      3. Show preview URL, ask user → posts_publish(id=<id>) on confirmation
  • If only one language is provided, ask whether the user wants help
    translating before publishing. Do not silently leave a locale empty.
  • Slug is auto-generated from the title (shared across locales).
  • Categories and tags are NOT localized and can be passed by name (looked up)
    or by ID. If a name doesn't exist, the tool errors — ask the user whether to
    use a different one.
  • IMAGES: a post can have a heroImage (top of article) and an SEO metaImage
    (the card shown when shared on social). Both take a MEDIA document ID.
      - To reuse an existing image, call media_list to find its id.
      - To add a NEW image, call media_upload (by url or server filePath) FIRST,
        then pass the returned id as heroImage / metaImage to posts_create or
        posts_update.
      - heroImage and metaImage are NOT localized — set them once; they apply to
        both en and vi.

═══════════════════════════════════════════════════════════════════════════
MEDIA (IMAGES) — RULES
═══════════════════════════════════════════════════════════════════════════

  • Media documents are shared (NOT localized) and are referenced by post
    heroImage and SEO metaImage via their document ID.
  • media_list: find existing images by filename/alt before uploading a new one.
  • media_upload: create a new image from EITHER a remote "url" (downloaded
    server-side) OR an absolute server "filePath" — never both. Always provide a
    descriptive "alt" for accessibility/SEO; ask the user for alt text if unclear.
  • Typical flow to add an image to a post:
      1. media_upload(url="https://...", alt="...")   → returns media id
      2. posts_update(id=<post>, heroImage=<media id>) (and/or metaImage)
  • There is no media_delete via MCP — manage deletions in the admin.

═══════════════════════════════════════════════════════════════════════════
APPLICATIONS (CVs) — HR WORKFLOWS
═══════════════════════════════════════════════════════════════════════════

  • Use applications_summary first when the user asks for an overview / report.
  • Use applications_list to browse candidates with filters; the response
    includes a direct CV download URL for each candidate.
  • Use applications_update_status to move candidates through the pipeline.
  • You CANNOT create or delete applications via MCP — that is a candidate-side
    public form.

═══════════════════════════════════════════════════════════════════════════
TECHNICAL NOTES
═══════════════════════════════════════════════════════════════════════════

  • Rich text fields accept simple Markdown:
      ## Heading 2     ### Heading 3     **bold**     --- (horizontal rule)
  • Vietnamese text MUST be sent as UTF-8.
  • Every response that creates/updates content includes:
      Status: <draft|published>
      Admin: <admin URL>
      Preview URL (draft) | Public URL (published): <url>
    Always relay these links to the user.
`

export function createMcpServer(payload: Payload): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        tools: {},
      },
      instructions: SERVER_INSTRUCTIONS,
    },
  )

  // ── server_info ───────────────────────────────────────────────────────────
  // Lets the AI answer "which version of the IEC CMS MCP are you using?" reliably,
  // instead of relying on the (often hidden) serverInfo from the initialize handshake.
  server.registerTool(
    'server_info',
    {
      title: 'MCP Server Info',
      description:
        'Return metadata about this MCP server: its name, semantic version, and the domains/tools ' +
        'it exposes. Call this when the user asks which version of the IEC CMS MCP server is running, ' +
        'or what this server can do.',
      inputSchema: {},
      outputSchema: {
        name: z.string().describe('Server identifier'),
        version: z.string().describe('Semantic version of the running MCP server'),
        domains: z.array(z.string()).describe('Content domains this server manages'),
      },
    },
    async () => {
      const info = {
        name: SERVER_NAME,
        version: SERVER_VERSION,
        domains: ['jobs', 'posts', 'media', 'applications'],
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(info, null, 2) }],
        structuredContent: info,
      }
    },
  )

  registerJobTools(server, payload)
  registerPostTools(server, payload)
  registerMediaTools(server, payload)
  registerApplicationTools(server, payload)

  return server
}
