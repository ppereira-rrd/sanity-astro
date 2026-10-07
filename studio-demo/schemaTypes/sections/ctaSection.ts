import {defineField, defineType} from 'sanity'

export const ctaSection = defineType({
  name: 'ctaSection',
  title: 'CTA Section',
  type: 'object',

  fields: [
    defineField({
      name: 'heading',
      type: 'string',
      title: 'Title',
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
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          title: 'Alt Text',
        }),
      ],
    }),

    defineField({
      name: 'buttonText',
      type: 'string',
      title: 'Button Label',
    }),

    defineField({
      name: 'buttonUrl',
      type: 'url',
      title: 'Button Link',
      validation: (rule) =>
        rule.uri({allowRelative: true, scheme: ['http', 'https', 'mailto', 'tel']}),
    }),
  ],

  preview: {
    select: {
      title: 'heading',
      subtitle: 'buttonText',
      media: 'image',
    },

    prepare({title, subtitle, media}) {
      return {
        title: title || 'CTA Section',
        subtitle,
        media,
      }
    },
  },
})
