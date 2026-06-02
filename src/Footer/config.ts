import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateFooter } from './hooks/revalidateFooter'

export const Footer: GlobalConfig = {
  slug: 'footer',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'contactLabel',
      type: 'text',
      label: 'Contact Button Label',
      localized: true,
    },
    {
      name: 'contactType',
      type: 'select',
      label: 'Contact Button Type',
      defaultValue: 'phone',
      options: [
        { label: 'Phone (Hotline)', value: 'phone' },
        { label: 'Email', value: 'email' },
      ],
      admin: {
        description:
          'Choose which contact info the button links to. The value comes from General Settings (Hotline or Email).',
      },
    },
    {
      name: 'copyright',
      type: 'text',
      label: 'Copyright Text',
    },
    {
      name: 'navItems',
      type: 'array',
      label: 'Bottom Nav Links',
      fields: [
        link({
          appearances: false,
          localizedLabel: true,
        }),
      ],
      maxRows: 6,
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/Footer/RowLabel#RowLabel',
        },
      },
    },
  ],
  hooks: {
    afterChange: [revalidateFooter],
  },
}
