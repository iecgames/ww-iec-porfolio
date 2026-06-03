/**
 * RS256 key material for signing/verifying OAuth access tokens.
 *
 * Private key (PKCS8 PEM) and public key (SPKI PEM) are provided base64-encoded
 * via env so multi-line PEMs survive serverless config. The public key is
 * published at /api/oauth/jwks; only it is ever exported as a JWK.
 */
import { exportJWK, importPKCS8, importSPKI, type CryptoKey } from 'jose'

export const ALG = 'RS256'
export const KID = process.env.OAUTH_JWT_KID || 'iec-mcp-1'

function decodePem(b64: string | undefined, label: string): string {
  if (!b64) throw new Error(`Missing env ${label}`)
  return Buffer.from(b64, 'base64').toString('utf8')
}

let _priv: Promise<CryptoKey> | undefined
let _pub: Promise<CryptoKey> | undefined

export function getPrivateKey(): Promise<CryptoKey> {
  if (!_priv) {
    _priv = importPKCS8(decodePem(process.env.OAUTH_JWT_PRIVATE_KEY, 'OAUTH_JWT_PRIVATE_KEY'), ALG)
  }
  return _priv
}

export function getPublicKey(): Promise<CryptoKey> {
  if (!_pub) {
    _pub = importSPKI(decodePem(process.env.OAUTH_JWT_PUBLIC_KEY, 'OAUTH_JWT_PUBLIC_KEY'), ALG)
  }
  return _pub
}

/** JWKS document with public-only key parameters. */
export async function getPublicJwks(): Promise<{ keys: Record<string, unknown>[] }> {
  const jwk = await exportJWK(await getPublicKey())
  return { keys: [{ ...jwk, kid: KID, alg: ALG, use: 'sig' }] }
}
