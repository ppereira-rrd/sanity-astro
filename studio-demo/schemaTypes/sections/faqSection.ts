import {defineArrayMember, defineField, defineType} from 'sanity'
import {HelpCircleIcon} from '@sanity/icons/HelpCircle'

export const faqSection = defineType({
  name: 'faqSection',
  title: 'FAQ Section',
  type: 'object',
  icon: HelpCircleIcon,

  fields: [
    defineField({
      name: 'heading',
      type: 'string',
      title: 'Heading',
      initialValue: 'Frequently asked questions',
    }),

    defineField({
      name: 'faqs',
      type: 'array',
      title: 'FAQs',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'faqItem',
          fields: [
            defineField({
              name: 'question',
              type: 'string',
              title: 'Question',
              validation: (rule) => rule.required(),
            }),

            defineField({
              name: 'answer',
              type: 'array',
              title: 'Answer',
              of: [{type: 'block'}],
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: {
              title: 'question',
            },
          },
        }),
      ],
      validation: (rule) => rule.required().min(1),
    }),

    defineField({
      name: 'includeSchemaMarkup',
      type: 'boolean',
      title: 'Output FAQ structured data (JSON-LD)',
      description: 'Adds FAQPage schema.org markup for search engines. Turn off for non-public Q&A.',
      initialValue: true,
    }),
  ],

  preview: {
    select: {
      heading: 'heading',
      faqs: 'faqs',
    },

    prepare({heading, faqs}) {
      const count = faqs?.length ?? 0

      return {
        title: heading || 'FAQ Section',
        subtitle: `${count} question${count === 1 ? '' : 's'}`,
      }
    },
  },
})
