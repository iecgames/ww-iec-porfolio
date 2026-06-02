import type { GlobalConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { revalidateGeneral } from './hooks/revalidateGeneral'

export const General: GlobalConfig = {
  slug: 'general',
  label: 'General Settings',
  access: {
    read: () => true,
    update: authenticated,
  },
  admin: {
    group: 'Site Settings',
  },
  fields: [
    {
      name: 'companyName',
      type: 'text',
      required: true,
      localized: true,
      label: 'Company Name',
      admin: {
        description: 'Used in emails, browser tab, and meta tags.',
      },
    },
    {
      name: 'address',
      type: 'text',
      localized: true,
      label: 'Address',
      admin: {
        description: 'Head office address. Displayed in the footer.',
      },
    },
    {
      name: 'hotline',
      type: 'text',
      label: 'Hotline',
      admin: {
        description: 'Hotline number. Displayed in the footer.',
      },
    },
    {
      name: 'email',
      type: 'email',
      label: 'Email',
      admin: {
        description: 'Contact email. Displayed in the footer.',
      },
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Site Logo',
      admin: {
        description: 'Main logo displayed in the header and emails.',
      },
    },
    {
      name: 'favicon',
      type: 'upload',
      relationTo: 'media',
      label: 'Favicon',
      admin: {
        description: 'Browser tab icon. Recommended: 32×32 or 64×64 PNG/ICO.',
      },
    },
    {
      name: 'tagline',
      type: 'text',
      localized: true,
      label: 'Tagline',
      admin: {
        description: 'Short slogan displayed under the logo or in meta tags.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      label: 'Site Description',
      admin: {
        description: 'Default meta description for SEO. Keep under 160 characters.',
      },
    },
  ],
  hooks: {
    afterChange: [revalidateGeneral],
  },
}
