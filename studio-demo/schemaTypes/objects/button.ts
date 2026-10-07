import {defineField, defineType} from 'sanity'
import {LinkIcon} from '@sanity/icons/Link'

/**
 * A standalone call-to-action link. Lives in a post body so it keeps its place in the
 * article, and in a page's sections so it can stand on its own.
 */
export const button = defineType({
  name: 'button',
  title: 'Button',
  type: 'object',
  icon: LinkIcon,

  fields: [
    defineField({
      name: 'label',
      type: 'string',
      title: 'Label',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'url',
      type: 'url',
      title: 'URL',
      validation: (rule) =>
        rule
          .required()
          .uri({allowRelative: true, scheme: ['http', 'https', 'mailto', 'tel']}),
    }),
  ],

  preview: {
    select: {
      title: 'label',
      subtitle: 'url',
    },

    prepare({title, subtitle}) {
      return {
        title: title || 'Button',
        subtitle,
      }
    },
  },
})
