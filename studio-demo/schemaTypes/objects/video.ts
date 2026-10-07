import {defineField, defineType} from 'sanity'
import {PlayIcon} from '@sanity/icons/Play'

/**
 * An embedded video inside a post body. Migrated posts carry YouTube, Vimeo and
 * self-hosted URLs lifted out of Elementor's video widget.
 */
export const video = defineType({
  name: 'video',
  title: 'Video',
  type: 'object',
  icon: PlayIcon,

  fields: [
    defineField({
      name: 'url',
      type: 'url',
      title: 'Video URL',
      description: 'A YouTube, Vimeo or direct video file URL',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'title',
      type: 'string',
      title: 'Title',
      description: 'Used as the embed’s accessible name',
    }),
  ],

  preview: {
    select: {
      title: 'title',
      url: 'url',
    },

    prepare({title, url}) {
      return {
        title: title || 'Video',
        subtitle: url,
      }
    },
  },
})
