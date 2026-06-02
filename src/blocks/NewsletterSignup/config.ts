import type { Block } from 'payload'

export const NewsletterSignup: Block = {
  slug: 'newsletterSignup',
  interfaceName: 'NewsletterSignupBlock',
  labels: {
    singular: 'Get In Touch',
    plural: 'Get In Touch',
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Eyebrow',
      localized: true,
      admin: {
        description: 'Small label above the heading, e.g. "Contact us"',
      },
    },
    {
      name: 'heading',
      type: 'text',
      label: 'Heading',
      localized: true,
      required: true,
      admin: {
        description: 'Main section heading, e.g. "Get In Touch"',
      },
    },
    {
      name: 'subtitle',
      type: 'textarea',
      label: 'Subtitle',
      localized: true,
    },
    {
      type: 'group',
      name: 'contact',
      label: 'Contact Information Panel',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Panel Title',
          localized: true,
          admin: {
            description: 'e.g. "Contact Information"',
          },
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Panel Description',
          localized: true,
        },
        {
          name: 'phones',
          type: 'array',
          label: 'Phone Numbers',
          labels: {
            singular: 'Phone',
            plural: 'Phones',
          },
          fields: [
            {
              name: 'number',
              type: 'text',
              required: true,
            },
          ],
        },
        {
          name: 'email',
          type: 'text',
          label: 'Email',
        },
        {
          name: 'address',
          type: 'text',
          label: 'Address',
          localized: true,
        },
      ],
    },
  ],
}
