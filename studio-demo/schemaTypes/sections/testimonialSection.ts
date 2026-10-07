import {defineField, defineType} from 'sanity'
import {sameLanguageFilter} from '../fields/shared'

/**
 * Pulls hand-picked Testimonial documents into a page or post. The picker is
 * filtered to the language of the document being edited, so a Spanish page can
 * only show Spanish testimonials.
 */
export const testimonialSection = defineType({
  name: 'testimonialSection',
  title: 'Testimonial Section',
  type: 'object',

  fields: [
    defineField({
      name: 'heading',
      type: 'string',
      title: 'Heading',
    }),

    defineField({
      name: 'testimonials',
      type: 'array',
      title: 'Testimonials',
      of: [
        {
          type: 'reference',
          to: [{type: 'testimonial'}],
          options: {filter: sameLanguageFilter},
        },
      ],
      validation: (rule) => rule.unique().min(1),
    }),
  ],

  preview: {
    select: {
      heading: 'heading',
      first: 'testimonials.0.name',
      count: 'testimonials.length',
      media: 'testimonials.0.photo',
    },
    prepare({heading, first, count, media}) {
      const total = count ?? 0

      return {
        title: heading || first || 'Testimonial Section',
        subtitle: `Testimonials · ${total} selected`,
        media,
      }
    },
  },
})
