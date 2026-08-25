import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { revalidateDelete, revalidateSocial } from './Social/hooks/revalidateSocial'

export const Social: CollectionConfig = {
  slug: 'social',
  admin: {
    useAsTitle: 'platform',
    defaultColumns: ['platform', 'url', 'order'],
    group: 'Site Settings',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  hooks: {
    afterChange: [revalidateSocial],
    afterDelete: [revalidateDelete],
  },
  fields: [
    {
      name: 'platform',
      type: 'select',
      required: true,
      options: [
        { label: 'LinkedIn', value: 'linkedin' },
        { label: 'Facebook', value: 'facebook' },
        { label: 'Instagram', value: 'instagram' },
        { label: 'YouTube', value: 'youtube' },
        { label: 'Twitter / X', value: 'twitter' },
        { label: 'TikTok', value: 'tiktok' },
        { label: 'Discord', value: 'discord' },
      ],
    },
    {
      name: 'url',
      type: 'text',
      required: true,
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Lower numbers appear first',
      },
    },
  ],
}
