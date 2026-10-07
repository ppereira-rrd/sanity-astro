import {defineField, defineType} from 'sanity'
import {PlayIcon} from '@sanity/icons/Play'
import {bodyMembers, languageField, wordpressIdField} from '../fields/shared'

/**
 * A video page — the same shape as `page` (basic info, SEO, one document per
 * language), plus the video itself and its transcript. WordPress serves these
 * from its own `videos` post type at /videos/<slug>/.
 *
 * Named `videos` rather than `video` because the `video` object type is already
 * taken by the embeds the migration lifts out of Elementor into a section body.
 */
export const videosType = defineType({
  name: 'videos',
  title: 'Video',
  type: 'document',
  icon: PlayIcon,

  fields: [
    // One document per language, linked as translations — use the language
    // switcher at the top of the document to move between en and es.
    languageField,

    defineField({
      name: 'basic',
      type: 'basicFields',
      title: 'Basic Information',
    }),

    defineField({
      name: 'videoUrl',
      type: 'url',
      title: 'Video URL',
      description: 'A YouTube, Vimeo or direct video file URL',
      validation: (rule) =>
        rule.required().uri({scheme: ['http', 'https']}),
    }),

    defineField({
      name: 'transcript',
      type: 'array',
      title: 'Transcript',
      description: 'What is said in the video — indexable copy for search engines',
      of: bodyMembers,
    }),

    defineField({
      name: 'seo',
      type: 'seo',
      title: 'SEO & Social',
    }),

    wordpressIdField,
  ],

  // Because basicFields is used instead of defining the fields in every page/post type
  // a preview is need like the below so it looks proper on sanity.
  preview: {
    select: {
      title: 'basic.title',
      language: 'language',
      media: 'basic.featuredImage',
    },

    prepare({title, language, media}) {
      return {
        title: title || 'Untitled Video',
        subtitle: language?.toUpperCase() ?? 'No language',
        media,
      }
    },
  },
})
