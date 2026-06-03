/**
 * ES256 key material for signing/verifying OAuth access tokens.
 *
 * Only the private key (EC P-256, PKCS8 PEM) is supplied — base64-encoded via env
 * so the multi-line PEM survives serverless config. The public key is *derived*
 * from it at runtime (no separate env var), keeping the function's env footprint
 * under AWS Lambda's 4KB limit. The public key is published at /api/oauth/jwks.
 */
import { exportJWK, importJWK, importPKCS8, type CryptoKey } from 'jose'

export const ALG = 'ES256'
export const KID = process.env.OAUTH_JWT_KID || 'iec-mcp-1'

function decodePem(b64: string | undefined, label: string): string {
  if (!b64) throw new Error(`Missing env ${label}`)
  return Buffer.from(b64, 'base64').toString('utf8')
}

let _priv: Promise<CryptoKey> | undefined
let _pub: Promise<CryptoKey> | undefined

export function getPrivateKey(): Promise<CryptoKey> {
  if (!_priv) {
    // extractable: required so we can exportJWK() to derive the public key/JWKS.
    // The key stays in-process; only its public params are ever published.
    _priv = importPKCS8(decodePem(process.env.OAUTH_JWT_PRIVATE_KEY, 'OAUTH_JWT_PRIVATE_KEY'), ALG, {
      extractable: true,
    })
  }
  return _priv
}

/**
 * Public key derived from the private key — no separate env needed. Exporting the
 * private key as a JWK yields the public params (crv/x/y); stripping the private
 * scalar `d` leaves a public-only JWK we re-import for verification.
 */
export function getPublicKey(): Promise<CryptoKey> {
  if (!_pub) {
    _pub = getPrivateKey().then(async (priv) => {
      const { d: _d, ...pub } = await exportJWK(priv)
      return (await importJWK({ ...pub, alg: ALG }, ALG)) as CryptoKey
    })
  }
  return _pub
}

/** JWKS document with public-only key parameters (private scalar `d` stripped). */
export async function getPublicJwks(): Promise<{ keys: Record<string, unknown>[] }> {
  const { d: _d, ...jwk } = await exportJWK(await getPrivateKey())
  return { keys: [{ ...jwk, kid: KID, alg: ALG, use: 'sig' }] }
}
