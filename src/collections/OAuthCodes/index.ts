import type { CollectionConfig } from 'payload'

/**
 * Short-lived, one-time OAuth authorization codes.
 *
 * Created by /api/oauth/authorize on consent, consumed by /api/oauth/token.
 * Deny-all access; all operations use `overrideAccess: true`. Hidden in admin.
 */
const denyAll = () => false

export const OAuthCodes: CollectionConfig = {
  slug: 'oauth-codes',
  admin: { hidden: true },
  access: { create: denyAll, read: denyAll, update: denyAll, delete: denyAll },
  fields: [
    { name: 'code', type: 'text', required: true, index: true, unique: true },
    { name: 'client_id', type: 'text', required: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'redirect_uri', type: 'text', required: true },
    { name: 'code_challenge', type: 'text', required: true },
    { name: 'code_challenge_method', type: 'text', defaultValue: 'S256' },
    { name: 'scope', type: 'text', defaultValue: 'mcp' },
    { name: 'resource', type: 'text' },
    { name: 'expires_at', type: 'date', required: true, index: true },
    { name: 'used', type: 'checkbox', defaultValue: false },
  ],
  timestamps: true,
}
