import type { Field } from 'payload'

/**
 * A reusable link group for hero buttons. Lets editors pick one of:
 *  - Internal page   → relationship to pages/posts
 *  - Page section    → dropdown of existing Anchor IDs on this document (SectionSelect)
 *  - External URL    → raw URL
 *
 * Only shown for the Video Hero (mirrors the existing hero field conditions).
 */
export const buttonLink = (name: string, label: string): Field => ({
  name,
  type: 'group',
  label,
  admin: {
    hideGutter: true,
    condition: (_, { type } = {}) => type === 'videoHero',
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'radio',
          defaultValue: 'reference',
          admin: { layout: 'horizontal', width: '65%' },
          options: [
            { label: 'Internal page', value: 'reference' },
            { label: 'Page section', value: 'section' },
            { label: 'External URL', value: 'custom' },
          ],
        },
        {
          name: 'newTab',
          type: 'checkbox',
          label: 'Open in new tab',
          admin: { width: '35%', style: { alignSelf: 'flex-end' } },
        },
      ],
    },
    {
      name: 'reference',
      type: 'relationship',
      relationTo: ['pages', 'posts'],
      label: 'Document to link to',
      admin: {
        condition: (_, siblingData) => siblingData?.type === 'reference',
      },
    },
    {
      name: 'section',
      type: 'text',
      label: 'Page section',
      admin: {
        condition: (_, siblingData) => siblingData?.type === 'section',
        description: 'Chọn một block (có Anchor ID) trên trang này để cuộn thẳng tới đó.',
        components: {
          Field: '@/heros/fields/SectionSelect#SectionSelect',
        },
      },
    },
    {
      name: 'url',
      type: 'text',
      label: 'External URL',
      admin: {
        condition: (_, siblingData) => siblingData?.type === 'custom',
        placeholder: 'https://example.com',
      },
    },
  ],
})
