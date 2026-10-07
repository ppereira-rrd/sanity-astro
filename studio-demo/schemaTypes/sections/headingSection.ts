import {defineField, defineType} from 'sanity'
import {bodyMembers} from '../fields/shared'

export const headingSection = defineType({
  name: 'headingSection',
  title: 'Heading + Text Section',
  type: 'object',

  fields: [
    defineField({
      name: 'heading',
      type: 'string',
      title: 'Heading',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'headingLevel',
      type: 'string',
      title: 'Heading Level',
      options: {
        list: [
          {title: 'H2', value: 'h2'},
          {title: 'H3', value: 'h3'},
          {title: 'H4', value: 'h4'},
          {title: 'H5', value: 'h5'},
          {title: 'H6', value: 'h6'},
        ],
        layout: 'dropdown',
      },
      initialValue: 'h2',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'body',
      type: 'array',
      title: 'Body Text',
      // Same members as a post body: the migration splits an article at its headings,
      // so an inline image, video or button can land in any one of these sections.
      of: bodyMembers,
    }),
  ],

  preview: {
    select: {
      title: 'heading',
      level: 'headingLevel',
    },

    prepare({title, level}) {
      return {
        title: title || 'Heading + Text',
        subtitle: level ? level.toUpperCase() : 'Heading',
      }
    },
  },
})
