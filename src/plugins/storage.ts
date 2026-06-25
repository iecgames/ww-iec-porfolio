import { gcsStorage } from '@payloadcms/storage-gcs'
import { s3Storage } from '@payloadcms/storage-s3'
import type { StorageOptions } from '@google-cloud/storage'
import { readFileSync } from 'fs'
import type { Plugin } from 'payload'

type StorageProvider = 'local' | 'minio' | 'gcs'

const COLLECTIONS = { media: true } as const

const resolveProvider = (): StorageProvider => {
  const raw = (process.env.STORAGE_PROVIDER || 'local').toLowerCase()
  if (raw === 'local' || raw === 'minio' || raw === 'gcs') {
    return raw
  }
  // eslint-disable-next-line no-console
  console.warn(
    `[storage] Unknown STORAGE_PROVIDER="${raw}". Falling back to "local". Valid values: local | minio | gcs.`,
  )
  return 'local'
}

const buildMinio = (): Plugin => {
  const required = [
    'MINIO_BUCKET',
    'MINIO_ACCESS_KEY_ID',
    'MINIO_SECRET_ACCESS_KEY',
    'MINIO_ENDPOINT',
  ] as const
  const missing = required.filter((k) => !process.env[k])
  if (missing.length) {
    throw new Error(`[storage] STORAGE_PROVIDER=minio but missing env: ${missing.join(', ')}`)
  }
  return s3Storage({
    collections: COLLECTIONS,
    bucket: process.env.MINIO_BUCKET!,
    config: {
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY_ID!,
        secretAccessKey: process.env.MINIO_SECRET_ACCESS_KEY!,
      },
      endpoint: process.env.MINIO_ENDPOINT!,
      region: process.env.MINIO_REGION || 'us-east-1',
      forcePathStyle: true,
    },
  })
}

// Loads a service-account JSON either from a file path (GCS_KEY_FILE) or an
// inline base64-encoded JSON string (GCS_CREDENTIALS). Inline takes priority so
// the same env var works in environments that don't support filesystem secrets.
// Base64 is required for inline because raw JSON containing newlines/quotes
// gets mangled when piped through Docker/Coolify env variable layers.
const loadGcsCredentials = (): StorageOptions => {
  const inline = process.env.GCS_CREDENTIALS
  const keyFile = process.env.GCS_KEY_FILE
  const projectId = process.env.GCS_PROJECT_ID

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
      ...(projectId ? { projectId } : {}),
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
      ...(projectId ? { projectId } : {}),
      credentials: parsed as StorageOptions['credentials'],
    }
  }

  // Fall through to Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS
  // or workload identity). projectId stays optional — GCS infers it from ADC.
  return projectId ? { projectId } : {}
}

const buildGcs = (): Plugin => {
  if (!process.env.GCS_BUCKET) {
    throw new Error('[storage] STORAGE_PROVIDER=gcs but missing env: GCS_BUCKET')
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

export const storagePlugin = (): Plugin | null => {
  const provider = resolveProvider()
  switch (provider) {
    case 'minio':
      return buildMinio()
    case 'gcs':
      return buildGcs()
    case 'local':
    default:
      return null
  }
}
