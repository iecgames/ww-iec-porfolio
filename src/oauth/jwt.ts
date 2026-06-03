/**
 * Sign and verify OAuth access tokens (RS256 JWT).
 */
import { jwtVerify, SignJWT, type JWTPayload } from 'jose'

import { ACCESS_TOKEN_TTL, ISSUER, MCP_RESOURCE, SUPPORTED_SCOPE } from './config'
import { ALG, getPrivateKey, getPublicKey, KID } from './keys'

export async function signAccessToken(opts: {
  sub: string
  client_id: string
  scope?: string
}): Promise<string> {
  return new SignJWT({ client_id: opts.client_id, scope: opts.scope ?? SUPPORTED_SCOPE })
    .setProtectedHeader({ alg: ALG, kid: KID })
    .setIssuer(ISSUER)
    .setSubject(opts.sub)
    .setAudience(MCP_RESOURCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
    .sign(await getPrivateKey())
}

/** Verifies signature, issuer, audience and expiry. Throws on any failure. */
export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, await getPublicKey(), {
    issuer: ISSUER,
    audience: MCP_RESOURCE,
  })
  return payload
}
