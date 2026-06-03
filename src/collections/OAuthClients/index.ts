import type { CollectionConfig } from 'payload'

/**
 * OAuth clients registered via Dynamic Client Registration (RFC 7591).
 *
 * Deny-all access: every operation goes through the OAuth route handlers
 * with `overrideAccess: true`. Hidden from the admin UI.
 */
const denyAll = () => false

export const OAuthClients: CollectionConfig = {
  slug: 'oauth-clients',
  admin: { hidden: true },
  access: { create: denyAll, read: denyAll, update: denyAll, delete: denyAll },
  fields: [
    { name: 'client_id', type: 'text', required: true, index: true, unique: true },
    { name: 'client_secret', type: 'text' },
    { name: 'client_name', type: 'text' },
    {
      name: 'redirect_uris',
      type: 'array',
      fields: [{ name: 'uri', type: 'text', required: true }],
    },
    { name: 'grant_types', type: 'json' },
    { name: 'token_endpoint_auth_method', type: 'text', defaultValue: 'none' },
    { name: 'scope', type: 'text', defaultValue: 'mcp' },
  ],
  timestamps: true,
}
