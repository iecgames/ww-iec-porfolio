import type { GlobalConfig } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { authenticated } from '../access/authenticated'
import { revalidateEmailTemplates } from './hooks/revalidateEmailTemplates'

const bodyEditor = lexicalEditor({
  features: ({ rootFeatures }) => [
    ...rootFeatures,
    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
    FixedToolbarFeature(),
    InlineToolbarFeature(),
    HorizontalRuleFeature(),
  ],
})

/**
 * Content for the two automatic notification emails.
 *
 * Configure once here and every notification the Posts/Jobs hooks fire uses it.
 * Leave a body empty to keep the built-in layout for that type — an
 * unconfigured site keeps behaving exactly as it did before this global
 * existed, rather than mailing blank messages.
 */
export const EmailTemplates: GlobalConfig = {
  slug: 'email-templates',
  label: 'Email Templates',
  access: {
    read: () => true,
    update: authenticated,
  },
  admin: {
    group: 'Newsletter',
  },
  hooks: {
    afterChange: [revalidateEmailTemplates],
  },
  fields: [
    {
      name: 'newPost',
      type: 'group',
      label: 'Thư báo bài viết mới',
      fields: [
        {
          name: 'subject',
          type: 'text',
          label: 'Tiêu đề thư',
          admin: {
            description: 'Token: {{post.title}}. Để trống để dùng tiêu đề mặc định.',
          },
        },
        {
          name: 'previewText',
          type: 'text',
          label: 'Dòng xem trước',
          admin: {
            description: 'Đoạn ngắn hiển thị cạnh tiêu đề trong hộp thư.',
          },
        },
        {
          name: 'body',
          type: 'richText',
          label: 'Nội dung',
          editor: bodyEditor,
          admin: {
            description:
              'Token: {{post.title}}, {{post.url}}, {{subscriber.name}}. Để trống để dùng mẫu mặc định.',
          },
        },
      ],
    },
    {
      name: 'newJob',
      type: 'group',
      label: 'Thư báo vị trí tuyển dụng mới',
      fields: [
        {
          name: 'subject',
          type: 'text',
          label: 'Tiêu đề thư',
          admin: {
            description: 'Token: {{job.title}}. Để trống để dùng tiêu đề mặc định.',
          },
        },
        {
          name: 'previewText',
          type: 'text',
          label: 'Dòng xem trước',
          admin: {
            description: 'Đoạn ngắn hiển thị cạnh tiêu đề trong hộp thư.',
          },
        },
        {
          name: 'body',
          type: 'richText',
          label: 'Nội dung',
          editor: bodyEditor,
          admin: {
            description:
              'Token: {{job.title}}, {{job.url}}, {{subscriber.name}}. Để trống để dùng mẫu mặc định.',
          },
        },
      ],
    },
  ],
}
