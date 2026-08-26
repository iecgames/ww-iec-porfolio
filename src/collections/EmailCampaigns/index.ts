import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

/**
 * A record of one notification that went out — not something an editor writes.
 *
 * Content for these emails is configured once in the Email Templates global;
 * the Posts/Jobs hooks create a campaign and send it in the same step. Nothing
 * here is authored by hand, so creation and updates are closed to the UI and
 * happen only through the hooks' overrideAccess writes. Deletes stay open so
 * old rows can be cleared.
 */
export const EmailCampaigns: CollectionConfig = {
  slug: 'email-campaigns',
  labels: {
    singular: 'Email Campaign',
    plural: 'Email Campaigns',
  },
  access: {
    create: () => false,
    read: authenticated,
    update: () => false,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'status', 'sentAt', 'recipientCount'],
    group: 'Newsletter',
    description:
      'Nhật ký các thư đã gửi. Nội dung thư cấu hình tại Newsletter → Email Templates.',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Campaign Name',
      admin: { readOnly: true },
    },
    {
      name: 'subject',
      type: 'text',
      label: 'Email Subject',
      admin: {
        readOnly: true,
        description: 'Tiêu đề đã gửi đi, sau khi thay token.',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      label: 'Campaign Type',
      options: [
        { label: 'New Job', value: 'new_job' },
        { label: 'New Post', value: 'new_post' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'relatedJob',
      type: 'relationship',
      relationTo: 'jobs',
      label: 'Related Job',
      admin: {
        readOnly: true,
        condition: (data) => data.type === 'new_job',
      },
    },
    {
      name: 'relatedPost',
      type: 'relationship',
      relationTo: 'posts',
      label: 'Related Post',
      admin: {
        readOnly: true,
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
  ],
}
