import {defineField, defineType} from 'sanity'
import {CommentIcon} from '@sanity/icons/Comment'
import {languageField} from '../fields/shared'

/**
 * A client testimonial. Pulled into pages and posts through the Testimonial
 * Section. One document per language, linked as translations — use the language
 * switcher at the top of the document.
 */
export const testimonialType = defineType({
  name: 'testimonial',
  title: 'Testimonial',
  type: 'document',
  icon: CommentIcon,
  fields: [
    languageField,
    defineField({
      name: 'quote',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'name',
      type: 'string',
      description: 'Who said it. Leave blank to show the quote anonymously.',
    }),
    defineField({
      name: 'role',
      type: 'string',
      description: 'Shown under the name, e.g. "Personal Injury Client"',
    }),
    defineField({
      name: 'photo',
      type: 'image',
      options: {hotspot: true},
    }),
  ],
  preview: {
    select: {
      name: 'name',
      quote: 'quote',
      language: 'language',
      media: 'photo',
    },
    prepare({name, quote, language, media}) {
      return {
        title: name || 'Anonymous',
        subtitle: [language?.toUpperCase() ?? 'No language', quote].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
