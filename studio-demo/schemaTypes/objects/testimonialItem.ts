import {defineField, defineType} from 'sanity'
import {CommentIcon} from '@sanity/icons/Comment'

/**
 * A testimonial that belongs to one page or post rather than the shared library —
 * the kind baked into a page's own carousel.
 *
 * Use a reference to a `testimonial` document when the same quote appears in more
 * than one place; use this when it doesn't.
 */
export const testimonialItem = defineType({
  name: 'testimonialItem',
  title: 'Testimonial',
  type: 'object',
  icon: CommentIcon,

  fields: [
    defineField({
      name: 'quote',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'name',
      type: 'string',
      description: 'Who said it. Leave blank to show the quote anonymously.',
    }),

    defineField({
      name: 'role',
      type: 'string',
      description: 'Shown under the name, e.g. "Personal Injury Client"',
    }),
  ],

  preview: {
    select: {
      name: 'name',
      quote: 'quote',
    },

    prepare({name, quote}) {
      return {
        title: name || 'Anonymous',
        subtitle: quote,
      }
    },
  },
})
