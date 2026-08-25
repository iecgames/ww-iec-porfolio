import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { authenticated } from '../../access/authenticated'

export const EmailCampaigns: CollectionConfig = {
  slug: 'email-campaigns',
  labels: {
    singular: 'Email Campaign',
    plural: 'Email Campaigns',
  },
  access: {
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'status', 'sentAt', 'recipientCount'],
    group: 'Newsletter',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Campaign Name',
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
      label: 'Email Subject',
      admin: {
        description: 'Supports tokens: {{job.title}}, {{post.title}}',
      },
    },
    {
      name: 'previewText',
      type: 'text',
      label: 'Preview Text',
      admin: {
        description: 'Short preview text shown in email clients',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      label: 'Campaign Type',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'New Job', value: 'new_job' },
        { label: 'New Post', value: 'new_post' },
      ],
    },
    {
      name: 'body',
      type: 'richText',
      label: 'Email Body',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => [
          ...rootFeatures,
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
          FixedToolbarFeature(),
          InlineToolbarFeature(),
          HorizontalRuleFeature(),
        ],
      }),
      admin: {
        description:
          'Optional override. Nội dung mặc định cấu hình ở Newsletter → Email Templates. Tokens: {{post.title}}, {{post.url}}, {{job.title}}, {{job.url}}, {{subscriber.name}}',
      },
    },
    {
      name: 'relatedJob',
      type: 'relationship',
      relationTo: 'jobs',
      label: 'Related Job',
      admin: {
        condition: (data) => data.type === 'new_job',
      },
    },
    {
      name: 'relatedPost',
      type: 'relationship',
      relationTo: 'posts',
      label: 'Related Post',
      admin: {
        condition: (data) => data.type === 'new_post',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      label: 'Status',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Sending', value: 'sending' },
        { label: 'Sent', value: 'sent' },
      ],
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'sentAt',
      type: 'date',
      label: 'Sent At',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: {
          displayFormat: 'dd/MM/yyyy HH:mm',
        },
      },
    },
    {
      name: 'recipientCount',
      type: 'number',
      label: 'Recipients',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'sendAction',
      type: 'ui',
      admin: {
        components: {
          Field: '@/collections/EmailCampaigns/ui/SendButton#SendButton',
        },
      },
    },
  ],
}
