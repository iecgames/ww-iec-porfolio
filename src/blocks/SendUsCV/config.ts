import type { Block } from 'payload'

export const SendUsCV: Block = {
  slug: 'sendUsCV',
  interfaceName: 'SendUsCVBlock',
  labels: {
    singular: 'Send Us CV',
    plural: 'Send Us CV Blocks',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: "Don't see a perfect fit?",
      label: 'Heading',
      localized: true,
    },
    {
      name: 'subtitle',
      type: 'textarea',
      defaultValue:
        'We are always looking for passionate people to join us. Send us your CV and tell us how you can make a difference at IEC Games.',
      label: 'Subtitle',
      localized: true,
    },
    {
      name: 'cvUrl',
      type: 'text',
      label: 'CV / Apply URL',
      admin: {
        description: 'Link for the "Send Us Your CV" button',
      },
    },
    {
      name: 'innovatorLabel',
      type: 'text',
      defaultValue: 'Join 100+ Innovators today',
      label: 'Innovator Label',
      localized: true,
    },
  ],
}
