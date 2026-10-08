import {defineField, defineType} from 'sanity'
import {ThListIcon} from '@sanity/icons/ThList'

/**
 * Holds no content of its own — the frontend builds the list from the other
 * sections on the same page or post. Place it where the table should appear.
 */
export const tableOfContentsSection = defineType({
  name: 'tableOfContentsSection',
  title: 'Table of Contents',
  type: 'object',
  icon: ThListIcon,

  fields: [
    defineField({
      name: 'heading',
      type: 'string',
      title: 'Heading',
      initialValue: 'Table of contents',
    }),

    defineField({
      name: 'headingLevels',
      type: 'array',
      title: 'Heading levels to include',
      description: 'Heading + Text sections at these levels become entries',
      of: [{type: 'string'}],
      options: {
        list: [
          {title: 'H2', value: 'h2'},
          {title: 'H3', value: 'h3'},
          {title: 'H4', value: 'h4'},
        ],
        layout: 'grid',
      },
      initialValue: ['h2'],
      validation: (rule) => rule.required().min(1).unique(),
    }),

    defineField({
      name: 'includeFaq',
      type: 'boolean',
      title: 'Include FAQ section',
      description: 'Adds a link to the FAQ section, if the page has one',
      initialValue: true,
    }),

    defineField({
      name: 'collapsible',
      type: 'boolean',
      title: 'Collapsible',
      description: 'Let readers collapse the list',
      initialValue: false,
    }),
  ],

  preview: {
    select: {
      heading: 'heading',
      levels: 'headingLevels',
    },

    prepare({heading, levels}) {
      return {
        title: heading || 'Table of Contents',
        subtitle: levels?.length ? levels.join(', ').toUpperCase() : 'No levels selected',
      }
    },
  },
})
