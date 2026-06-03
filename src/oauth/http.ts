/**
 * Small HTTP helpers shared by the OAuth route handlers.
 */
export const OAUTH_CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export function jsonResponse(
  body: unknown,
  init: { status?: number; cache?: string } = {},
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...OAUTH_CORS,
  }
  if (init.cache) headers['Cache-Control'] = init.cache
  else headers['Cache-Control'] = 'no-store'
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers })
}

/** RFC 6749 §5.2 style error response. */
export function oauthError(
  error: string,
  description?: string,
  status = 400,
): Response {
  return jsonResponse(
    { error, ...(description ? { error_description: description } : {}) },
    { status },
  )
}

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: OAUTH_CORS })
}
