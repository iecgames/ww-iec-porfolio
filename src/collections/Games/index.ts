import type { CollectionConfig } from 'payload'

import { slugField } from 'payload'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'
import { revalidateGame, revalidateGameDelete } from './hooks/revalidateGame'

export const Games: CollectionConfig = {
  slug: 'games',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'publishedAt', 'updatedAt'],
  },
  defaultPopulate: {
    title: true,
    slug: true,
    cover: true,
    description: true,
    badges: true,
    playUrl: true,
    downloads: true,
    appStoreUrl: true,
    googlePlayUrl: true,
  },
  versions: {
    drafts: {
      autosave: {
        interval: 375,
      },
    },
    maxPerDoc: 25,
  },
  hooks: {
    afterChange: [revalidateGame],
    afterDelete: [revalidateGameDelete],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      admin: {
        description: 'Short tagline shown under the title on portfolio cards.',
      },
    },
    {
      name: 'badges',
      type: 'array',
      labels: { singular: 'Badge', plural: 'Badges' },
      maxRows: 4,
      admin: {
        description: 'Short pills shown on the card (e.g. "18+", "TOP 10", "200+ Downloads").',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          localized: true,
        },
      ],
    },
    {
      name: 'playUrl',
      type: 'text',
      label: 'Play URL',
      admin: {
        description: 'External link to play / download the game.',
      },
    },
    {
      name: 'appStoreUrl',
      type: 'text',
      label: 'App Store URL',
      admin: {
        description: 'Apple App Store link.',
      },
    },
    {
      name: 'googlePlayUrl',
      type: 'text',
      label: 'Google Play URL',
      admin: {
        description: 'Google Play Store link.',
      },
    },
    {
      name: 'downloads',
      type: 'text',
      label: 'Downloads',
      localized: true,
      admin: {
        description: 'Số lượt tải hiển thị trên card (ví dụ: "10M+", "500K+").',
        placeholder: '10M+',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === 'published' && !value) {
              return new Date()
            }
            return value
          },
        ],
      },
    },
    slugField(),
  ],
}
