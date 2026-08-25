import type { CollectionConfig } from 'payload'
import { authenticated } from '../../access/authenticated'
import { generateSubscriberToken } from './hooks/generateToken'

export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  labels: {
    singular: 'Subscriber',
    plural: 'Subscribers',
  },
  access: {
    create: () => true,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'source', 'subscribed', 'subscribedAt'],
    group: 'Newsletter',
  },
  hooks: {
    beforeChange: [generateSubscriberToken],
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'source',
      type: 'select',
      options: [
        { label: 'Contact Form', value: 'contact' },
        // Kept for historical rows — these paths no longer create subscribers.
        { label: 'Job Application', value: 'job_application' },
        { label: 'Form Submission', value: 'form_submission' },
        { label: 'Newsletter Signup', value: 'newsletter' },
      ],
    },
    {
      name: 'subscribed',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'unsubscribeToken',
      type: 'text',
      unique: true,
      access: {
        read: () => false,
      },
      admin: {
        hidden: true,
      },
    },
    {
      name: 'subscribedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'unsubscribedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
}
