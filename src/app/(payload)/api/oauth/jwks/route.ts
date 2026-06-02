/**
 * JWKS endpoint — publishes the RS256 public key used to sign access tokens.
 *
 * GET /api/oauth/jwks
 */
import { corsPreflight, jsonResponse } from '@/oauth/http'
import { getPublicJwks } from '@/oauth/keys'

export async function GET(): Promise<Response> {
  const jwks = await getPublicJwks()
  return jsonResponse(jwks, { cache: 'public, max-age=3600' })
}

export function OPTIONS(): Response {
  return corsPreflight()
}
