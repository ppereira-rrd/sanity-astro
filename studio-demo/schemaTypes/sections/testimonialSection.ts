import {defineField, defineType} from 'sanity'
import {sameLanguageFilter} from '../fields/shared'

/**
 * Testimonials on a page or post, either way round: a reference to a shared
 * `testimonial` document when the same quote is used in several places, or a
 * `testimonialItem` written here when it belongs to this page alone — which is what
 * the WordPress migration lifts out of a page's own carousel.
 *
 * The reference picker is filtered to the language of the document being edited, so
 * a Spanish page can only show Spanish testimonials.
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
        {type: 'testimonialItem'},
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
