import {defineField, defineType} from 'sanity'

export const featureGridSection = defineType({
  name: 'featureGridSection',
  title: 'Feature Grid Section',
  type: 'object',

  fields: [
    defineField({
      name: 'heading',
      type: 'string',
      title: 'Heading',
    }),

    defineField({
      name: 'features',
      type: 'array',
      title: 'Features',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              type: 'string',
              title: 'Title',
              validation: (rule) => rule.required(),
            }),

            defineField({
              name: 'text',
              type: 'array',
              title: 'Text',
              of: [{type: 'block'}],
            }),
          ],
          preview: {
            select: {
              title: 'title',
            },
          },
        },
      ],
    }),
  ],
})