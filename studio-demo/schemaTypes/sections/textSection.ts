import {defineField, defineType} from 'sanity'
import {bodyMembers} from '../fields/shared'

/**
 * A run of rich text with no heading of its own. Pages and posts are built entirely
 * out of sections, so this is what holds the copy that opens an article before its
 * first heading — and anywhere else an editor wants prose without a new heading.
 */
export const textSection = defineType({
  name: 'textSection',
  title: 'Body Text',
  type: 'object',

  fields: [
    defineField({
      name: 'body',
      type: 'array',
      title: 'Body Text',
      of: bodyMembers,
      validation: (rule) => rule.required().min(1),
    }),
  ],

  preview: {
    select: {
      body: 'body',
    },

    prepare({body}) {
      const first = (body ?? []).find(
        (block: {_type?: string}) => block._type === 'block',
      ) as {children?: Array<{text?: string}>} | undefined

      const text = (first?.children ?? [])
        .map((child) => child.text ?? '')
        .join('')
        .trim()

      return {
        title: text || 'Body Text',
        subtitle: 'Body Text',
      }
    },
  },
})
