import type { CollectionConfig } from 'payload'

/**
 * OAuth refresh tokens (stored as a SHA-256 hash, never the raw token).
 *
 * Created/rotated by /api/oauth/token. Deny-all access; all operations use
 * `overrideAccess: true`. Hidden in admin.
 */
const denyAll = () => false

export const OAuthRefreshTokens: CollectionConfig = {
  slug: 'oauth-refresh-tokens',
  admin: { hidden: true },
  access: { create: denyAll, read: denyAll, update: denyAll, delete: denyAll },
  fields: [
    { name: 'token_hash', type: 'text', required: true, index: true, unique: true },
    { name: 'client_id', type: 'text', required: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'scope', type: 'text', defaultValue: 'mcp' },
    { name: 'resource', type: 'text' },
    { name: 'expires_at', type: 'date', required: true, index: true },
    { name: 'revoked', type: 'checkbox', defaultValue: false },
  ],
  timestamps: true,
}
