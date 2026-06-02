import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'
import { notifyJobSubscribers } from './hooks/notifySubscribers'
import { revalidateJob, revalidateJobDelete } from './hooks/revalidateJob'

export const Jobs: CollectionConfig = {
  slug: 'jobs',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'department', 'location', 'employmentType', 'updatedAt'],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 375,
      },
    },
    maxPerDoc: 25,
  },
  hooks: {
    afterChange: [revalidateJob, notifyJobSubscribers],
    afterDelete: [revalidateJobDelete],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Job Title',
      localized: true,
    },
    {
      name: 'isFeatured',
      type: 'checkbox',
      defaultValue: false,
      label: 'Featured Job',
      admin: {
        position: 'sidebar',
        description: 'Show this job in the CareersHighlight block on the home page.',
      },
    },
    {
      name: 'relatedJobs',
      type: 'relationship',
      relationTo: 'jobs',
      hasMany: true,
      maxRows: 3,
      label: 'Related Jobs',
      admin: {
        position: 'sidebar',
        description:
          'Manually pin up to 3 related jobs shown at the bottom of this posting. Leave empty to auto-suggest jobs from the same department.',
      },
    },
    {
      name: 'notifySubscribers',
      type: 'checkbox',
      defaultValue: true,
      label: 'Notify subscribers',
      admin: {
        position: 'sidebar',
        description:
          'Automatically send a promotional email to all subscribers when this job is first published.',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Overview',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'department',
                  type: 'text',
                  required: true,
                  label: 'Department',
                  admin: { width: '50%' },
                },
                {
                  name: 'location',
                  type: 'text',
                  required: true,
                  label: 'Location',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'employmentType',
                  type: 'select',
                  label: 'Employment Type',
                  defaultValue: 'fullTime',
                  options: [
                    { label: 'Full-time', value: 'fullTime' },
                    { label: 'Part-time', value: 'partTime' },
                    { label: 'Contract', value: 'contract' },
                    { label: 'Internship', value: 'internship' },
                  ],
                  admin: { width: '50%' },
                },
                {
                  name: 'workingHours',
                  type: 'text',
                  label: 'Working Hours',
                  admin: {
                    width: '50%',
                    description: 'e.g. "9AM – 6PM, Mon–Fri"',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'salaryLabel',
                  type: 'text',
                  defaultValue: 'Competitive',
                  label: 'Salary Label',
                  admin: { width: '50%', description: 'e.g. "Competitive" or "$80k–$120k"' },
                },
                {
                  name: 'linkedinUrl',
                  type: 'text',
                  label: 'External Job Detail',
                  admin: {
                    width: '50%',
                    description: 'Link to the job posting on an external site (e.g. LinkedIn).',
                  },
                },
              ],
            },
            {
              name: 'description',
              type: 'textarea',
              label: 'Short Summary',
              localized: true,
              admin: {
                description: 'One-paragraph summary shown under the title on the detail page.',
              },
            },
          ],
        },
        {
          label: 'Job Description',
          fields: [
            {
              name: 'jobDescription',
              type: 'richText',
              label: false,
              localized: true,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => [
                  ...rootFeatures,
                  HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
                  FixedToolbarFeature(),
                  InlineToolbarFeature(),
                  HorizontalRuleFeature(),
                ],
              }),
            },
          ],
        },
        {
          label: 'Qualifications',
          fields: [
            {
              name: 'qualifications',
              type: 'richText',
              label: false,
              localized: true,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => [
                  ...rootFeatures,
                  HeadingFeature({ enabledHeadingSizes: ['h3', 'h4'] }),
                  FixedToolbarFeature(),
                  InlineToolbarFeature(),
                ],
              }),
            },
          ],
        },
        {
          label: 'Benefits',
          fields: [
            {
              name: 'benefits',
              type: 'richText',
              label: false,
              localized: true,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => [
                  ...rootFeatures,
                  HeadingFeature({ enabledHeadingSizes: ['h3', 'h4'] }),
                  FixedToolbarFeature(),
                  InlineToolbarFeature(),
                ],
              }),
            },
          ],
        },
      ],
    },
  ],
}
