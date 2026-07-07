# MCP Integration — IEC Web

Model Context Protocol (MCP) server nhúng vào Next.js App Router, cho phép AI Agent gọi HTTP để tự động tạo, cập nhật và quản lý nội dung trong Payload CMS — bao gồm **job postings**, **blog posts**, và **HR review** of CV submissions.

> **Server v2.0** — Tools được mở rộng cho posts và applications. Tất cả thao tác `create` đều tạo **DRAFT**, AI Agent phải hỏi confirm trước khi publish. Mọi tool create/update đều trả về **preview URL** để user review.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Setup](#3-setup)
4. [Authentication](#4-authentication)
5. [Transport & Protocol](#5-transport--protocol)
6. [Tools Reference](#6-tools-reference)
7. [Localization](#7-localization)
8. [Lexical Markdown Syntax](#8-lexical-markdown-syntax)
9. [CORS & Remote Access](#9-cors--remote-access)
10. [Testing with MCP Inspector](#10-testing-with-mcp-inspector)
11. [AI Agent Configuration Examples](#11-ai-agent-configuration-examples)
12. [Security Considerations](#12-security-considerations)
13. [File Structure](#13-file-structure)

---

## 1. Overview

The MCP server exposes **15 tools** across 3 domains:

### Jobs (bilingual postings — 7 tools)

| Tool | Action |
|------|--------|
| `jobs_list` | List jobs with filters (status, department, location, …) |
| `jobs_get` | Get a single job by ID (returns admin + preview URL) |
| `jobs_create` | Create a job as **DRAFT** in one locale |
| `jobs_update` | Update fields of an existing job (does not change publish status) |
| `jobs_publish` | Flip draft → published (call only after user confirms) |
| `jobs_unpublish` | Revert published → draft |
| `jobs_delete` | Permanently delete a job |

### Posts (blog posts — 7 tools)

| Tool | Action |
|------|--------|
| `posts_list` | List posts with filters (status, category, tag, search) |
| `posts_get` | Get a single post by ID (returns admin + preview URL) |
| `posts_create` | Create a post as **DRAFT** |
| `posts_update` | Update fields (does not change publish status) |
| `posts_publish` | Flip draft → published (call only after user confirms) |
| `posts_unpublish` | Revert published → draft |
| `posts_delete` | Permanently delete a post |

### Applications (CV submissions — HR-only, 4 tools)

| Tool | Action |
|------|--------|
| `applications_list` | List candidates with filters; includes CV download URL |
| `applications_get` | Full details of one application (CV + experience + notes) |
| `applications_summary` | Aggregate stats — total, last 7 days, by status, by position |
| `applications_update_status` | Move candidate through pipeline + append HR note |

### Workflow rules (delivered via MCP `instructions`)

1. **Drafts by default** — `*_create` always produces a draft. AI must NEVER assume publish.
2. **Preview before publish** — every create/update response includes:
   ```
   Status: draft
   Admin: http://…/admin/collections/posts/abc123
   Preview URL (draft): http://…/next/preview?path=/en/posts/my-post&previewSecret=…
   ```
   AI shows these links to the user.
3. **Explicit confirmation** — AI asks "Bạn muốn publish chưa?" and only calls `*_publish` after a yes.
4. **Bilingual jobs** — `jobs_create(locale=en)` MUST be followed by `jobs_update(id, locale=vi)` before publish.

**Key design decisions:**
- **Embedded** in the existing Next.js app — no additional server to deploy.
- **Payload Local API** is used directly (no HTTP round-trip to itself).
- **Stateless per-request** — each HTTP call creates a fresh MCP server instance; no session state is persisted.
- **`instructions` field** — server sends workflow rules in the `initialize` response so every connected client (Claude, Cursor, Cline, …) loads them automatically.
- **Locale-aware (jobs)** — jobs accept `locale` (`en` | `vi`). Posts are English-only.
- **Plain text / markdown input** — richText fields accept ordinary text strings; the server converts them to Payload Lexical JSON automatically.

---

## 2. Architecture

```
AI Agent (Claude / GPT / custom)
         │
         │  POST https://your-site.com/api/mcp
         │  Authorization: Bearer <OAuth 2.1 access token>
         ▼
┌─────────────────────────────────────────────────────────┐
│  Next.js App Router                                     │
│  src/app/(payload)/api/mcp/route.ts                     │
│                                                         │
│  1. Verify OAuth JWT (iss/aud/exp/scope/signature)      │
│  2. Create McpServer + WebStandardStreamableHTTP        │
│     Transport (per-request, stateless)                  │
│  3. server.connect(transport)                           │
│  4. transport.handleRequest(request) → Response         │
└─────────────────────────────────────────────────────────┘
         │
         │  Payload Local API (in-process)
         ▼
┌────────────────────┐
│  MongoDB            │
│  jobs collection   │
└────────────────────┘
```

### Source Files

```
src/
├── mcp/
│   ├── server.ts                ← McpServer factory + workflow `instructions`
│   ├── tools/
│   │   ├── jobs.ts              ← 7 job tools (incl. publish/unpublish)
│   │   ├── posts.ts             ← 7 post tools (incl. publish/unpublish)
│   │   └── applications.ts      ← 4 HR tools (list/get/summary/status)
│   └── utils/
│       ├── lexical.ts           ← Plain text → Payload Lexical JSON converter
│       └── links.ts             ← Build admin + preview URLs for responses
└── app/(payload)/api/mcp/
    └── route.ts                 ← HTTP route handler (POST / GET / DELETE / OPTIONS)
```

---

## 3. Setup

### Environment Variables

The endpoint is authenticated via the embedded OAuth 2.1 Authorization Server.
Add its variables to `.env` (see `.env.example` for the full list):

```env
# MCP OAuth 2.1 (embedded Authorization Server)
OAUTH_ISSUER=http://localhost:3000
OAUTH_JWT_PRIVATE_KEY=   # base64-encoded EC P-256 private key PEM
OAUTH_JWT_KID=iec-mcp-1
```

> Generate the signing key with:
> `openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out priv.pem && base64 -w0 priv.pem`

### No Additional Dependencies

The only new package is `@modelcontextprotocol/sdk@1.29.0` (installed) and `zod@4.4.3` (installed). The MCP endpoint is active immediately after the app starts.

---

## 4. Authentication

`/api/mcp` is an **OAuth 2.1 protected resource**. Every request must carry a
valid access token (ES256 JWT) issued by this app's embedded Authorization
Server:

```
Authorization: Bearer <OAuth 2.1 access token>
```

The route verifies the token's signature, issuer, audience, expiry, and the
`mcp` scope. MCP clients that support OAuth (ChatGPT, Claude, VS Code, …) obtain
the token automatically:

1. Client calls `/api/mcp` with no token → gets `401` + a
   `WWW-Authenticate: Bearer resource_metadata="…"` header (RFC 9728).
2. Client follows the protected-resource metadata to the Authorization Server,
   performs Dynamic Client Registration + PKCE, and the user logs in with their
   Payload account and consents.
3. Client retries `/api/mcp` with the issued access token.

Failure responses:

```json
// Missing / invalid / expired token
HTTP/1.1 401 Unauthorized
{ "jsonrpc": "2.0", "error": { "code": -32001, "message": "Unauthorized" }, "id": null }

// Valid token but missing the `mcp` scope
HTTP/1.1 403 Forbidden
{ "jsonrpc": "2.0", "error": { "code": -32001, "message": "Insufficient scope" }, "id": null }
```

See `.env.example` (`OAUTH_*` variables) and `src/oauth/` for the Authorization
Server implementation.

---

## 5. Transport & Protocol

The endpoint implements the **MCP Streamable HTTP transport** (spec version `2025-06-18`).

| Method | Purpose |
|--------|---------|
| `POST /api/mcp` | Send JSON-RPC messages (initialize, tool calls) |
| `GET /api/mcp` | Open SSE stream for server-to-client notifications |
| `DELETE /api/mcp` | Terminate a session (returns 405 — sessions are stateless) |
| `OPTIONS /api/mcp` | CORS preflight |

### Protocol Flow

```
AI Agent                        MCP Server (/api/mcp)
   │                                    │
   │── POST initialize ──────────────►  │
   │◄── InitializeResult ──────────────  │  (lists capabilities + tools)
   │                                    │
   │── POST tools/call (jobs_create) ► │
   │◄── CallToolResult ────────────────  │  (created job JSON)
```

The server is **stateless** — the `initialize` handshake and the tool call can be separate HTTP requests. Clients must send `initialize` before making tool calls.

---

## 6. Tools Reference

All tools return `{ content: [{ type: "text", text: "..." }] }`. Every create/update tool appends a links block:

```
Status: draft
Admin: https://your-site/admin/collections/<collection>/<id>
Preview URL (draft): https://your-site/next/preview?path=…&previewSecret=…
```

Source of truth for parameters: see the `inputSchema` blocks in the source files (each parameter has a Zod `.describe(...)`).

| Source | Tools |
|--------|-------|
| `src/mcp/tools/jobs.ts` | `jobs_list`, `jobs_get`, `jobs_create`, `jobs_update`, `jobs_publish`, `jobs_unpublish`, `jobs_delete` |
| `src/mcp/tools/posts.ts` | `posts_list`, `posts_get`, `posts_create`, `posts_update`, `posts_publish`, `posts_unpublish`, `posts_delete` |
| `src/mcp/tools/applications.ts` | `applications_list`, `applications_get`, `applications_summary`, `applications_update_status` |

The sections below cover the most-used tools.

---

### `jobs_list`

List job postings with optional filters.

**Input:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `locale` | `"en" \| "vi"` | `"en"` | Content locale to return |
| `department` | `string?` | — | Filter by exact department name |
| `location` | `string?` | — | Filter by location (partial match) |
| `employmentType` | `"fullTime" \| "partTime" \| "contract" \| "internship"` | — | Filter by type |
| `limit` | `number` | `20` | Max results (1–100) |

**Output:** JSON with `total` count and `items` array (id, title, department, location, employmentType, workingHours, salaryLabel, description, updatedAt).

**Example:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "jobs_list",
    "arguments": { "locale": "vi", "department": "Engineering", "limit": 10 }
  }
}
```

---

### `jobs_get`

Get a single job by ID with all content fields.

**Input:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | `string` | required | Job document ID |
| `locale` | `"en" \| "vi"` | `"en"` | Content locale to return |

---

### `jobs_create`

Create a new job posting **as a draft**. Does NOT publish — call `jobs_publish` after the user confirms.

**Input:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `locale` | `"en" \| "vi"` | no (default `"en"`) | Locale for this content |
| `title` | `string` | **yes** | Job title |
| `department` | `string` | **yes** | Department (not localized) |
| `location` | `string` | **yes** | Location (not localized) |
| `employmentType` | `"fullTime" \| "partTime" \| "contract" \| "internship"` | no | Default: `fullTime` |
| `workingHours` | `string` | no | e.g. `"9AM – 6PM, Mon–Fri"` |
| `salaryLabel` | `string` | no | e.g. `"Competitive"` or `"$80k–$120k"` |
| `linkedinUrl` | `string` | no | LinkedIn posting URL |
| `description` | `string` | no | Short one-paragraph summary (plain text) |
| `jobDescription` | `string` | no | Full job description (plain text / markdown) |
| `qualifications` | `string` | no | Candidate requirements (plain text / markdown) |
| `benefits` | `string` | no | Benefits offered (plain text / markdown) |

**Output:** Created job document JSON + `id`.

> richText fields (`jobDescription`, `qualifications`, `benefits`) accept plain text or [simple markdown](#8-lexical-markdown-syntax). The server converts them to Payload Lexical format automatically.

**Example:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "jobs_create",
    "arguments": {
      "locale": "en",
      "title": "Senior Frontend Engineer",
      "department": "Engineering",
      "location": "Hanoi, Vietnam",
      "employmentType": "fullTime",
      "workingHours": "9AM – 6PM, Mon–Fri",
      "salaryLabel": "Competitive",
      "description": "Join our team to build world-class web applications.",
      "jobDescription": "## About the Role\nWe are building the next generation...\n\n### Responsibilities\n- Design and implement frontend features\n- **Collaborate** with backend engineers\n---\nWork in an agile team.",
      "qualifications": "### Requirements\n- **5+ years** React/Next.js experience\n- Strong TypeScript skills\n- Experience with REST APIs",
      "benefits": "- Competitive salary\n- Annual performance bonus\n- Health insurance for employee and family\n- 15 days annual leave"
    }
  }
}
```

---

### `jobs_update`

Update one or more fields of an existing job. Only provided fields are modified; others are unchanged.

**Input:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | **yes** | Job document ID |
| `locale` | `"en" \| "vi"` | no (default `"en"`) | Locale of the content being updated |
| *(any field from `jobs_create`)* | | no | Field(s) to update |

> Setting `locale: "vi"` writes Vietnamese content to the same document without overwriting the English content.

**Example — add Vietnamese translation to an existing job:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "jobs_update",
    "arguments": {
      "id": "683abc123def456",
      "locale": "vi",
      "title": "Kỹ sư Frontend Senior",
      "description": "Tham gia nhóm của chúng tôi để xây dựng các ứng dụng web...",
      "jobDescription": "## Về vị trí\nChúng tôi đang xây dựng thế hệ tiếp theo...",
      "qualifications": "### Yêu cầu\n- **5+ năm** kinh nghiệm React/Next.js",
      "benefits": "- Mức lương cạnh tranh\n- Thưởng hiệu suất hàng năm"
    }
  }
}
```

---

### `jobs_delete`

Permanently delete a job posting.

**Input:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | **yes** | Job document ID to delete |

> This action is irreversible. The job will be removed from the database and all frontend pages will be revalidated.

---

## 7. Localization

The `jobs` collection has Payload localization enabled on these fields:

| Field | Localized | Notes |
|-------|-----------|-------|
| `title` | ✅ | Job title per language |
| `description` | ✅ | Short summary per language |
| `jobDescription` | ✅ | Main body richText per language |
| `qualifications` | ✅ | Requirements richText per language |
| `benefits` | ✅ | Benefits richText per language |
| `department` | ❌ | Shared metadata |
| `location` | ❌ | Shared metadata |
| `employmentType` | ❌ | Select value |
| `workingHours` | ❌ | Shared metadata |
| `salaryLabel` | ❌ | Shared metadata |
| `linkedinUrl` | ❌ | URL |

### Typical Workflow for a Bilingual Job

```
Step 1: Create English content
jobs_create({ locale: "en", title: "...", department: "...", location: "...", jobDescription: "..." })
→ Returns { id: "abc123" }

Step 2: Add Vietnamese translation to the same document
jobs_update({ id: "abc123", locale: "vi", title: "...", jobDescription: "..." })

Step 3: Verify both locales
jobs_get({ id: "abc123", locale: "en" })
jobs_get({ id: "abc123", locale: "vi" })
```

The Payload admin panel will show a locale switcher (EN/VI) on the job edit page after localization is enabled.

---

## 8. Lexical Markdown Syntax

RichText fields accept plain strings with these markdown conventions:

| Syntax | Result |
|--------|--------|
| `## Heading` | `<h2>` heading |
| `### Heading` | `<h3>` heading |
| `#### Heading` | `<h4>` heading |
| `**bold text**` | Bold inline text |
| `---` (alone on a line) | Horizontal rule `<hr>` |
| Empty line | Empty paragraph (visual spacing) |
| Plain text line | Regular paragraph |

**Example input:**
```
## Job Overview
We are looking for a motivated engineer to join our growing team.

### Key Responsibilities
- Build and maintain React applications
- **Own** the frontend architecture decisions
---
This is a hybrid role based in Hanoi.
```

> Lists (`-`) are rendered as plain paragraphs in the current converter. For structured lists, use separate lines with `- ` prefix in your plain text and they will be treated as individual paragraphs. If true list nodes are required, pass pre-formatted Lexical JSON instead of a plain string.

---

## 9. CORS & Remote Access

The `/api/mcp` endpoint sends these CORS headers on all responses:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, mcp-session-id, Last-Event-ID, mcp-protocol-version
Access-Control-Expose-Headers: mcp-session-id, mcp-protocol-version
```

CORS is open (`*`) because the endpoint is protected by the OAuth 2.1 Bearer token. Only callers with a valid access token can perform operations.

---

## 10. Testing with MCP Inspector

The [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) is the fastest way to manually test tools.

> **Access token needed.** The Inspector and `curl` do not run the OAuth flow, so
> you must supply an access token yourself. Either use the Inspector's built-in
> OAuth support (point it at the server and let it authorize), or mint a token
> directly with the app's signing key — see `src/oauth/jwt.ts` (`signAccessToken`),
> which the integration tests in `tests/int/oauth-mcp-guard.int.spec.ts` use.

```bash
pnpm run test:mcp
# or directly:
npx @modelcontextprotocol/inspector
```

> **⚠️ Common mistake:** Do NOT pass the URL as a CLI argument (`npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp`).
> The inspector treats positional arguments as a **STDIO command** to spawn, which fails with `ENOENT`.
> Always start the inspector with **no arguments** and configure the transport in the UI.

Then in the UI:
1. **Transport:** `Streamable HTTP` ← must select this, not "STDIO"
2. **URL:** `http://localhost:3000/api/mcp`
3. **Headers:** Add `Authorization: Bearer <access-token>`
4. Click **Connect**
5. Navigate to **Tools** tab → select any tool → fill inputs → **Call Tool**

### Quick curl test (check connectivity):
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {},
      "clientInfo": { "name": "curl-test", "version": "1.0" }
    }
  }'
```

Expected response includes `"result": { "serverInfo": { "name": "iec-payload-mcp" }, ... }`.

---

## 11. AI Agent Configuration Examples

### Claude Desktop (via HTTP — requires MCP client supporting Streamable HTTP)

```json
{
  "mcpServers": {
    "iec-web": {
      "url": "https://your-domain.com/api/mcp",
      "headers": {
        "Authorization": "Bearer <access-token>"
      }
    }
  }
}
```

### Custom AI Agent (TypeScript / Node.js)

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const transport = new StreamableHTTPClientTransport(
  new URL('https://your-domain.com/api/mcp'),
  {
    requestInit: {
      headers: { Authorization: 'Bearer <access-token>' },
    },
  },
)

const client = new Client({ name: 'my-agent', version: '1.0' })
await client.connect(transport)

// Create a job
const result = await client.callTool('jobs_create', {
  locale: 'en',
  title: 'Product Manager',
  department: 'Product',
  location: 'Ho Chi Minh City',
  employmentType: 'fullTime',
  jobDescription: '## About the Role\nLead product strategy...',
})

console.log(result.content[0].text)
```

### Python Agent Example

```python
import httpx, json

MCP_URL = "https://your-domain.com/api/mcp"
HEADERS = {
    "Authorization": "Bearer <access-token>",
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
}

def mcp_call(method, params):
    payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
    r = httpx.post(MCP_URL, headers=HEADERS, json=payload)
    return r.json()

# Initialize
mcp_call("initialize", {
    "protocolVersion": "2025-06-18",
    "capabilities": {},
    "clientInfo": {"name": "py-agent", "version": "1.0"}
})

# Create a job
result = mcp_call("tools/call", {
    "name": "jobs_create",
    "arguments": {
        "locale": "en",
        "title": "Data Analyst",
        "department": "Analytics",
        "location": "Hanoi, Vietnam",
        "jobDescription": "## Role\nAnalyze business data...",
    }
})
print(result)
```

---

## 12. Security Considerations

### What is protected
- Every request must present a valid OAuth 2.1 access token; the route verifies its signature, issuer, audience, expiry, and `mcp` scope before any MCP processing occurs.
- Missing / invalid / expired tokens are rejected (`401`); valid tokens lacking the `mcp` scope are rejected (`403`).

### What is NOT protected
- The `jobs` collection read access (`read: anyone` in Payload config) — the public REST API `/api/jobs` remains open for frontend use. MCP is only needed for write operations.

### Recommendations
- Keep `OAUTH_JWT_PRIVATE_KEY` secret — anyone holding it can mint valid tokens. Do not commit it to version control.
- Rotate the signing key (and `OAUTH_JWT_KID`) if compromised — update `.env` and redeploy; outstanding tokens stop verifying.
- Use short access-token TTLs (`OAUTH_ACCESS_TOKEN_TTL`) so leaked tokens expire quickly.
- In production, restrict access at the CDN/proxy level if possible (e.g., only allow requests from known AI agent IP ranges or VPN).
- The `jobs_delete` tool is permanent — consider removing it from registration in `server.ts` if you only want read/write access from agents.

### DNS Rebinding
The `WebStandardStreamableHTTPServerTransport` is configured without built-in origin restriction (`allowedOrigins` is not set). The OAuth Bearer token auth provides equivalent protection for a server deployment (DNS rebinding attacks require browser context).

---

## 13. File Structure

```
src/
├── mcp/
│   ├── server.ts                 McpServer factory
│   │                             └─ createMcpServer(payload) → McpServer
│   ├── tools/
│   │   └── jobs.ts               Tool definitions
│   │                             └─ registerJobTools(server, payload)
│   │                             Tools: jobs_list, jobs_get, jobs_create,
│   │                                    jobs_update, jobs_delete
│   └── utils/
│       └── lexical.ts            Markdown → Lexical JSON converter
│                                 └─ textToLexical(text) → LexicalRoot | undefined
└── app/(payload)/api/mcp/
    └── route.ts                  Next.js Route Handler
                                  Exports: GET, POST, DELETE, OPTIONS
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OAUTH_ISSUER` | no | Public base URL acting as the OAuth issuer (defaults to `NEXT_PUBLIC_SERVER_URL`) |
| `OAUTH_JWT_PRIVATE_KEY` | **yes** | Base64-encoded EC P-256 private key PEM used to sign access tokens |
| `OAUTH_JWT_KID` | no | Key ID published in the JWKS (defaults to `iec-mcp-1`) |
| `OAUTH_ACCESS_TOKEN_TTL` | no | Access token lifetime in seconds (defaults to `3600`) |
| `OAUTH_REFRESH_TOKEN_TTL` | no | Refresh token lifetime in seconds (defaults to `2592000`) |

### Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `@modelcontextprotocol/sdk` | `^1.29.0` | MCP server + transport |
| `zod` | `^4.4.3` | Tool input schema definitions |
