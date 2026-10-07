import {defineField, defineType} from 'sanity'

export const ctaSection = defineType({
  name: 'ctaSection',
  title: 'CTA Section',
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
      name: 'buttonText',
      type: 'string',
      title: 'Button Text',
    }),

    defineField({
      name: 'buttonUrl',
      type: 'url',
      title: 'Button URL',
    }),
  ],
})