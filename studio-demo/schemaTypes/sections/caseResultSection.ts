import {defineField, defineType} from 'sanity'
import {sameLanguageFilter} from '../fields/shared'

/**
 * Pulls hand-picked Case Result documents into a page or post. The picker is
 * filtered to the language of the document being edited, so a Spanish page can
 * only show Spanish case results.
 */
export const caseResultSection = defineType({
  name: 'caseResultSection',
  title: 'Case Result Section',
  type: 'object',

  fields: [
    defineField({
      name: 'heading',
      type: 'string',
      title: 'Heading',
    }),

    defineField({
      name: 'intro',
      type: 'text',
      title: 'Intro',
      rows: 3,
    }),

    defineField({
      name: 'caseResults',
      type: 'array',
      title: 'Case Results',
      of: [
        {
          type: 'reference',
          to: [{type: 'caseResult'}],
          options: {filter: sameLanguageFilter},
        },
      ],
      validation: (rule) => rule.unique().min(1),
    }),
  ],

  preview: {
    select: {
      heading: 'heading',
      first: 'caseResults.0.title',
      count: 'caseResults.length',
    },
    prepare({heading, first, count}) {
      const total = count ?? 0

      return {
        title: heading || first || 'Case Result Section',
        subtitle: `Case Results · ${total} selected`,
      }
    },
  },
})
