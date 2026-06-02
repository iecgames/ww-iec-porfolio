import type { Block } from 'payload'

export const PolicyTabs: Block = {
  slug: 'policyTabs',
  interfaceName: 'PolicyTabsBlock',
  labels: {
    singular: 'Policy Tabs',
    plural: 'Policy Tabs',
  },
  fields: [
    {
      name: 'tabs',
      type: 'array',
      label: 'Tabs',
      minRows: 1,
      fields: [
        {
          name: 'tabName',
          type: 'text',
          label: 'Tab Name',
          localized: true,
          required: true,
        },
        {
          name: 'icon',
          type: 'text',
          label: 'Tab Icon',
          admin: {
            description: 'Tìm và chọn icon (Tabler) hiển thị trước tên tab.',
            components: {
              Field: '@/fields/IconPicker/IconPickerField#IconPickerField',
            },
          },
        },
        {
          name: 'items',
          type: 'array',
          label: 'Checklist Items',
          fields: [
            {
              name: 'text',
              type: 'text',
              label: 'Item Text',
              localized: true,
              required: true,
            },
          ],
        },
      ],
    },
  ],
}
