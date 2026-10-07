import {defineField, defineType} from 'sanity'
import {sameLanguageFilter} from '../fields/shared'

/**
 * Displays the team on a page or post. Attorneys are hand-picked and ordered
 * here; the picker is filtered to the language of the document being edited.
 */
export const attorneySection = defineType({
  name: 'attorneySection',
  title: 'Attorney Section',
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
      name: 'attorneys',
      type: 'array',
      title: 'Attorneys',
      of: [
        {
          type: 'reference',
          to: [{type: 'attorney'}],
          options: {filter: sameLanguageFilter},
        },
      ],
      validation: (rule) => rule.unique().min(1),
    }),
  ],

  preview: {
    select: {
      heading: 'heading',
      first: 'attorneys.0.name',
      count: 'attorneys.length',
      media: 'attorneys.0.photo',
    },
    prepare({heading, first, count, media}) {
      const total = count ?? 0

      return {
        title: heading || first || 'Attorney Section',
        subtitle: `Attorneys · ${total} selected`,
        media,
      }
    },
  },
})
