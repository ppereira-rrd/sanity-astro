import {defineField, defineType} from 'sanity'
import {sameLanguageFilter} from '../fields/shared'

/**
 * Case results on a page or post, either way round: a reference to a shared
 * `caseResult` document when the same result is used in several places, or a
 * `caseResultItem` written here when it belongs to this page alone — which is what
 * the WordPress migration lifts out of a page's own carousel.
 *
 * The reference picker is filtered to the language of the document being edited, so
 * a Spanish page can only show Spanish case results.
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
        {type: 'caseResultItem'},
      ],
      validation: (rule) => rule.unique().min(1),
    }),
  ],

  preview: {
    select: {
      heading: 'heading',
      first: 'caseResults.0.title',
      firstAmount: 'caseResults.0.amount',
      count: 'caseResults.length',
    },
    prepare({heading, first, firstAmount, count}) {
      const total = count ?? 0

      return {
        title: heading || first || firstAmount || 'Case Result Section',
        subtitle: `Case Results · ${total} selected`,
      }
    },
  },
})
