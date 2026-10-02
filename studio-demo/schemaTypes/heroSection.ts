import {defineField, defineType} from 'sanity'

export const heroSection = defineType({
  name: 'heroSection',
  title: 'Hero Section',
  type: 'object',

  fields: [
    defineField({
      name: 'heading',
      type: 'string',
      title: 'Heading',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'text',
      type: 'array',
      title: 'Text',
      of: [{type: 'block'}],
    }),

    defineField({
      name: 'image',
      type: 'image',
      title: 'Image',
      options: {
        hotspot: true,
      },
    }),

    defineField({
      name: 'buttonText',
      type: 'string',
      title: 'Button Text',
    }),

    defineField({
      name: 'buttonUrl',
      type: 'string',
      title: 'Button URL',
    }),
  ],
})