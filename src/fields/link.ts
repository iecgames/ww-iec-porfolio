import type { Field, GroupField } from 'payload'

import deepMerge from '@/utilities/deepMerge'

export type LinkAppearances = 'default' | 'outline'

export const appearanceOptions: Record<LinkAppearances, { label: string; value: string }> = {
  default: {
    label: 'Default',
    value: 'default',
  },
  outline: {
    label: 'Outline',
    value: 'outline',
  },
}

export const staticRouteOptions: { label: string; value: string }[] = [
  { label: 'Home', value: '/' },
  { label: 'Posts (listing)', value: '/posts' },
  { label: 'Career', value: '/career' },
]

type LinkType = (options?: {
  appearances?: LinkAppearances[] | false
  disableLabel?: boolean
  localizedLabel?: boolean
  overrides?: Partial<GroupField>
}) => Field

export const link: LinkType = ({
  appearances,
  disableLabel = false,
  localizedLabel = false,
  overrides = {},
} = {}) => {
  const linkResult: GroupField = {
    name: 'link',
    type: 'group',
    admin: {
      hideGutter: true,
    },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'type',
            type: 'radio',
            admin: {
              layout: 'horizontal',
              width: '50%',
            },
            defaultValue: 'reference',
            options: [
              {
                label: 'Internal page',
                value: 'reference',
              },
              {
                label: 'Main pages',
                value: 'route',
              },
              {
                label: 'Anchor on this page',
                value: 'section',
              },
              {
                label: 'External URL',
                value: 'custom',
              },
            ],
          },
          {
            name: 'newTab',
            type: 'checkbox',
            admin: {
              style: {
                alignSelf: 'flex-end',
              },
              width: '50%',
            },
            label: 'Open in new tab',
          },
        ],
      },
    ],
  }

  const linkTypes: Field[] = [
    {
      name: 'reference',
      type: 'relationship',
      admin: {
        condition: (_, siblingData) => siblingData?.type === 'reference',
      },
      label: 'Document to link to',
      relationTo: ['pages', 'posts'],
      required: true,
    },
    {
      name: 'route',
      type: 'select',
      admin: {
        condition: (_, siblingData) => siblingData?.type === 'route',
        description: 'Pick a built-in page (Home, Posts listing, Career, Search).',
      },
      label: 'Main page',
      options: staticRouteOptions,
      required: true,
    },
    {
      name: 'section',
      type: 'text',
      admin: {
        condition: (_, siblingData) => siblingData?.type === 'section',
        description: 'Cuộn tới một block (có Anchor ID) trên trang này.',
        components: {
          Field: '@/fields/SectionSelect#SectionSelect',
        },
      },
      label: 'Anchor on this page',
      required: true,
    },
    {
      name: 'url',
      type: 'text',
      admin: {
        condition: (_, siblingData) => siblingData?.type === 'custom',
        placeholder: 'https://example.com',
      },
      label: 'External URL',
      required: true,
    },
  ]

  if (!disableLabel) {
    linkTypes.map((linkType) => ({
      ...linkType,
      admin: {
        ...linkType.admin,
        width: '50%',
      },
    }))

    linkResult.fields.push({
      type: 'row',
      fields: [
        ...linkTypes,
        {
          name: 'label',
          type: 'text',
          admin: {
            width: '50%',
          },
          label: 'Label',
          localized: localizedLabel,
          required: true,
        },
      ],
    })
  } else {
    linkResult.fields = [...linkResult.fields, ...linkTypes]
  }

  if (appearances !== false) {
    let appearanceOptionsToUse = [appearanceOptions.default, appearanceOptions.outline]

    if (appearances) {
      appearanceOptionsToUse = appearances.map((appearance) => appearanceOptions[appearance])
    }

    linkResult.fields.push({
      name: 'appearance',
      type: 'select',
      admin: {
        description: 'Choose how the link should be rendered.',
      },
      defaultValue: 'default',
      options: appearanceOptionsToUse,
    })
  }

  return deepMerge(linkResult, overrides)
}
