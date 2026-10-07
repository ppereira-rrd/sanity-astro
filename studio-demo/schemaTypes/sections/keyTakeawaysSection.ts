import {defineArrayMember, defineField, defineType} from 'sanity'
import {BulbOutlineIcon} from '@sanity/icons/BulbOutline'

export const keyTakeawaysSection = defineType({
  name: 'keyTakeawaysSection',
  title: 'Key Takeaways Section',
  type: 'object',
  icon: BulbOutlineIcon,

  fields: [
    defineField({
      name: 'heading',
      type: 'string',
      title: 'Heading',
      initialValue: 'Key takeaways',
    }),

    defineField({
      name: 'items',
      type: 'array',
      title: 'Takeaways',
      description: 'One short, self-contained point per item',
      of: [defineArrayMember({type: 'string'})],
      validation: (rule) => rule.required().min(1).max(10),
    }),
  ],

  preview: {
    select: {
      heading: 'heading',
      items: 'items',
    },

    prepare({heading, items}) {
      const count = items?.length ?? 0

      return {
        title: heading || 'Key Takeaways',
        subtitle: `${count} item${count === 1 ? '' : 's'}`,
      }
    },
  },
})
