import type { Field } from 'payload'

import { Banner } from '@/blocks/Banner/config'
import { CallToAction } from '@/blocks/CallToAction/config'
import { Code } from '@/blocks/Code/config'
import { Content } from '@/blocks/Content/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'
import { PolicyTabs } from '@/blocks/PolicyTabs/config'
import { link } from '@/fields/link'
import { linkGroup } from '@/fields/linkGroup'

export const hero: Field = {
  name: 'hero',
  type: 'group',
  fields: [
    {
      name: 'type',
      type: 'select',
      defaultValue: 'none',
      label: 'Type',
      options: [
        {
          label: 'None',
          value: 'none',
        },
        {
          label: 'Video Hero',
          value: 'videoHero',
        },
        {
          label: 'Brand Hero',
          value: 'brandHero',
        },
      ],
      required: true,
    },
    // --- Video Hero fields ---
    {
      name: 'videoSource',
      type: 'select',
      label: 'Video Source',
      defaultValue: 'upload',
      options: [
        { label: 'Upload', value: 'upload' },
        { label: 'YouTube', value: 'youtube' },
      ],
      admin: {
        condition: (_, { type } = {}) => type === 'videoHero',
      },
    },
    {
      name: 'videoFile',
      type: 'upload',
      label: 'Video File',
      relationTo: 'media',
      admin: {
        condition: (_, { type, videoSource } = {}) =>
          type === 'videoHero' && videoSource === 'upload',
      },
    },
    {
      name: 'youtubeUrl',
      type: 'text',
      label: 'YouTube URL',
      admin: {
        description: 'Enter the full YouTube URL (e.g. https://www.youtube.com/watch?v=xxxxx)',
        condition: (_, { type, videoSource } = {}) =>
          type === 'videoHero' && videoSource === 'youtube',
      },
    },
    {
      name: 'heading',
      type: 'text',
      label: 'Heading',
      localized: true,
      admin: {
        description:
          'Tiêu đề chính hiển thị trong vùng overlay. Phần nằm giữa cặp dấu \\\\ ... \\\\ sẽ được highlight (gradient, cỡ chữ lớn, xuống dòng riêng). Ví dụ: "Join us \\\\IEC Game - Winter Wolf\\\\" → "IEC Game - Winter Wolf" được highlight. Nếu không có dấu \\\\, mặc định highlight từ cuối cùng.',
        condition: (_, { type } = {}) => type === 'videoHero',
      },
    },
    {
      name: 'subtitle',
      type: 'textarea',
      label: 'Subtitle',
      localized: true,
      admin: {
        description: 'Subtitle / description text below the heading',
        condition: (_, { type } = {}) => type === 'videoHero',
      },
    },
    {
      name: 'overlayContent',
      type: 'blocks',
      label: 'Overlay Content',
      admin: {
        description: 'Content displayed inside the overlay area (left 2/3 of the screen)',
        condition: (_, { type } = {}) => type === 'videoHero',
      },
      blocks: [CallToAction, Content, MediaBlock, Banner, Code, PolicyTabs],
    },
    // --- Video Hero buttons ---
    {
      name: 'primaryButtonLabel',
      type: 'text',
      label: 'Primary Button Label',
      localized: true,
      admin: {
        condition: (_, { type } = {}) => type === 'videoHero',
      },
    },
    link({
      appearances: false,
      disableLabel: true,
      overrides: {
        name: 'primaryButton',
        label: 'Primary Button Link',
        admin: {
          hideGutter: true,
          condition: (_, { type } = {}) => type === 'videoHero',
        },
      },
    }),
    {
      name: 'secondaryButtonLabel',
      type: 'text',
      label: 'Secondary Button Label',
      localized: true,
      admin: {
        condition: (_, { type } = {}) => type === 'videoHero',
      },
    },
    link({
      appearances: false,
      disableLabel: true,
      overrides: {
        name: 'secondaryButton',
        label: 'Secondary Button Link',
        admin: {
          hideGutter: true,
          condition: (_, { type } = {}) => type === 'videoHero',
        },
      },
    }),
    // --- Brand Hero fields ---
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Eyebrow',
      localized: true,
      admin: {
        description: 'Small label above the heading (e.g. "Gaming Studio").',
        condition: (_, { type } = {}) => type === 'brandHero',
      },
    },
    {
      name: 'brandHeading',
      type: 'text',
      label: 'Brand Heading',
      localized: true,
      admin: {
        description: 'Large brand heading (e.g. "IEC Games").',
        condition: (_, { type } = {}) => type === 'brandHero',
      },
    },
    {
      name: 'tagline',
      type: 'textarea',
      label: 'Tagline',
      localized: true,
      admin: {
        description: 'Supporting paragraph under the heading.',
        condition: (_, { type } = {}) => type === 'brandHero',
      },
    },
    {
      name: 'inlineStats',
      type: 'array',
      label: 'Inline Stats',
      maxRows: 4,
      admin: {
        description:
          'Each stat shows a number that counts up from 0 when scrolled into view, followed by a unit suffix (e.g. value=2.5, suffix="B+", label="Total Downloads" → "2.5B+").',
        condition: (_, { type } = {}) => type === 'brandHero',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'value',
              type: 'number',
              required: true,
              admin: { width: '30%', description: 'Numeric value (e.g. 2.5, 50, 20).' },
            },
            {
              name: 'suffix',
              type: 'text',
              admin: {
                width: '30%',
                description: 'Unit / sign appended to the number (e.g. "B+", "M+", "+", "%").',
              },
            },
            {
              name: 'label',
              type: 'text',
              required: true,
              localized: true,
              admin: { width: '40%' },
            },
          ],
        },
      ],
    },
    {
      name: 'mascot',
      type: 'upload',
      label: 'Mascot Image',
      relationTo: 'media',
      admin: {
        condition: (_, { type } = {}) => type === 'brandHero',
      },
    },
    linkGroup({
      appearances: false,
      overrides: {
        name: 'cta',
        label: 'Hero CTA Button',
        maxRows: 1,
        admin: {
          initCollapsed: false,
          description:
            'Primary call-to-action button (e.g. "Explore us") shown next to the share / video buttons.',
          condition: (_, { type } = {}) => type === 'brandHero',
        },
      },
    }),
    {
      name: 'introVideoUrl',
      type: 'text',
      label: 'Intro Video URL',
      admin: {
        description:
          'Optional. YouTube / Vimeo URL or direct .mp4 link. When set, a play button appears next to the CTA and opens the video in a popup.',
        condition: (_, { type } = {}) => type === 'brandHero',
      },
    },
    {
      name: 'share',
      type: 'group',
      label: 'Share Widget',
      admin: {
        description:
          'QR / share popup next to the CTA. Pick which platforms to expose, an optional centre logo, and a colour preset for the QR code.',
        condition: (_, { type } = {}) => type === 'brandHero',
      },
      fields: [
        {
          name: 'enabledPlatforms',
          type: 'select',
          hasMany: true,
          defaultValue: ['facebook', 'x', 'linkedin', 'messenger', 'telegram', 'whatsapp', 'email'],
          options: [
            { label: 'Facebook', value: 'facebook' },
            { label: 'X / Twitter', value: 'x' },
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'Messenger', value: 'messenger' },
            { label: 'Telegram', value: 'telegram' },
            { label: 'WhatsApp', value: 'whatsapp' },
            { label: 'Email', value: 'email' },
          ],
        },
        {
          name: 'qrLogo',
          type: 'upload',
          relationTo: 'media',
          label: 'QR Centre Logo',
          admin: {
            description:
              'Image rendered at the centre of the QR code (use the site logo). The colour theme of the QR is chosen by the visitor inside the share popup.',
          },
        },
      ],
    },
    {
      name: 'decorations',
      type: 'array',
      label: 'Decorations',
      maxRows: 8,
      admin: {
        description:
          'Floating 3D / illustrated objects scattered around the hero. Each item has an image, a position, and an optional size %.',
        condition: (_, { type } = {}) => type === 'brandHero',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              required: true,
              admin: { width: '50%' },
            },
            {
              name: 'position',
              type: 'select',
              required: true,
              defaultValue: 'topLeft',
              options: [
                { label: 'Top Left', value: 'topLeft' },
                { label: 'Top Right', value: 'topRight' },
                { label: 'Bottom Left', value: 'bottomLeft' },
                { label: 'Bottom Right', value: 'bottomRight' },
                { label: 'Middle Left', value: 'middleLeft' },
                { label: 'Middle Right', value: 'middleRight' },
              ],
              admin: { width: '30%' },
            },
            {
              name: 'sizePercent',
              type: 'number',
              label: 'Size (%)',
              defaultValue: 8,
              min: 2,
              max: 30,
              admin: {
                width: '20%',
                description: 'Width as % of hero',
              },
            },
          ],
        },
      ],
    },
  ],
  label: false,
}
