import {defineField, defineType} from 'sanity'
import {StarIcon} from '@sanity/icons/Star'

/**
 * A case result that belongs to one page or post rather than the shared library —
 * the kind baked into a page's own carousel. Same fields as the `caseResult`
 * document, minus the ones only a standalone document needs.
 *
 * Use a reference to a `caseResult` document when the same result appears in more
 * than one place; use this when it doesn't.
 */
export const caseResultItem = defineType({
  name: 'caseResultItem',
  title: 'Case Result',
  type: 'object',
  icon: StarIcon,

  fields: [
    defineField({
      name: 'amount',
      type: 'string',
      description: 'Displayed as entered, e.g. "$1.2M"',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'caseType',
      type: 'string',
      description: 'Practice area or case type, e.g. "Truck Accident"',
    }),

    defineField({
      name: 'resultType',
      type: 'string',
      description: 'e.g. "Settlement" or "Verdict"',
    }),

    defineField({
      name: 'summary',
      type: 'text',
      rows: 4,
    }),
  ],

  preview: {
    select: {
      amount: 'amount',
      caseType: 'caseType',
      resultType: 'resultType',
    },

    prepare({amount, caseType, resultType}) {
      return {
        title: amount || 'Case Result',
        subtitle: [caseType, resultType].filter(Boolean).join(' · '),
      }
    },
  },
})
