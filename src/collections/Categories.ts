import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { syncSearchText } from './hooks/syncSearchText'
import { slugField } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    slugField({
      position: undefined,
    }),
    {
      name: 'searchText',
      type: 'text',
      localized: true,
      index: true,
      admin: { hidden: true, readOnly: true },
    },
  ],
  hooks: {
    beforeChange: [syncSearchText(['title'])],
  },
}
