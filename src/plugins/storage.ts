import { gcsStorage } from '@payloadcms/storage-gcs'
import type { StorageOptions } from '@google-cloud/storage'
import { readFileSync } from 'fs'
import type { Plugin } from 'payload'

// Loads a service-account JSON either from a file path (GCS_KEY_FILE) or an
// inline base64-encoded JSON string (GCS_CREDENTIALS). Inline takes priority so
// the same env var works in environments that don't support filesystem secrets.
// Base64 is required for inline because raw JSON containing newlines/quotes
// gets mangled when piped through Docker/Coolify env variable layers.
const loadGcsCredentials = (): StorageOptions => {
  const inline = process.env.GCS_CREDENTIALS
  const keyFile = process.env.GCS_KEY_FILE

  if (inline) {
    const trimmed = inline.trim()
    if (trimmed.startsWith('{')) {
      throw new Error(
        '[storage] GCS_CREDENTIALS must be base64-encoded JSON, not raw JSON. ' +
          'Encode the service-account key with: base64 -w0 key.json',
      )
    }
    let decoded: string
    try {
      decoded = Buffer.from(trimmed, 'base64').toString('utf8')
    } catch {
      throw new Error('[storage] GCS_CREDENTIALS is not valid base64.')
    }
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(decoded)
    } catch {
      throw new Error(
        '[storage] GCS_CREDENTIALS must decode to a valid JSON service-account key.',
      )
    }
    return {
      credentials: parsed as StorageOptions['credentials'],
    }
  }

  if (keyFile) {
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(readFileSync(keyFile, 'utf8'))
    } catch (err) {
      throw new Error(
        `[storage] Failed to read GCS_KEY_FILE at "${keyFile}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
    return {
      credentials: parsed as StorageOptions['credentials'],
    }
  }

  // Fall through to Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS
  // or workload identity). GCS infers the project ID from the credentials.
  return {}
}

export const storagePlugin = (): Plugin => {
  if (!process.env.GCS_BUCKET) {
    throw new Error('[storage] missing env: GCS_BUCKET')
  }
  return gcsStorage({
    // `disablePayloadAccessControl` makes Payload return the public GCS URL
    // (https://storage.googleapis.com/<bucket>/<key>) as the media `url`
    // instead of proxying every request through the /api/media/file
    // serverless route. This removes a serverless hop + Netlify↔GCS roundtrip
    // so Next.js Image fetches straight from Google's edge.
    collections: {
      media: {
        disablePayloadAccessControl: true,
      },
    },
    // No `acl` on purpose: the bucket grants public read at the bucket level
    // (uniform bucket-level access + allUsers IAM). Setting acl: 'Public' here
    // would call makePublic() (object ACL API), which FAILS on uniform-access
    // buckets and would break every upload. Objects inherit bucket-level access.
    bucket: process.env.GCS_BUCKET,
    options: loadGcsCredentials(),
  })
}
