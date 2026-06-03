/**
 * PKCE (RFC 7636) — S256 only.
 */
export async function sha256base64url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Buffer.from(buf).toString('base64url')
}

export async function verifyPkceS256(verifier: string, challenge: string): Promise<boolean> {
  return (await sha256base64url(verifier)) === challenge
}
