import {defineField, defineType} from 'sanity'

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
          type: 'object',
          fields: [
            defineField({
              name: 'quote',
              type: 'text',
              title: 'Quote',
              validation: (rule) => rule.required(),
            }),

            defineField({
              name: 'name',
              type: 'string',
              title: 'Name',
            }),
          ],
          preview: {
            select: {
              title: 'name',
              subtitle: 'quote',
            },
          },
        },
      ],
    }),
  ],
})