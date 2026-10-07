import {defineField, defineType} from 'sanity'
import {UsersIcon} from '@sanity/icons/Users'
import {bodyMembers, languageField, wordpressIdField} from '../fields/shared'

/**
 * An attorney profile. Gets its own page, and is pulled into pages and posts
 * through the Attorney Section. One document per language, linked as
 * translations — use the language switcher at the top of the document.
 *
 * Not to be confused with `author`, which is only the byline on a post.
 */
export const attorneyType = defineType({
  name: 'attorney',
  title: 'Attorney',
  type: 'document',
  icon: UsersIcon,
  fields: [
    languageField,
    defineField({
      name: 'name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug',
      type: 'slug',
      description: 'The attorney’s own page lives at this slug',
      options: {source: 'name', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'role',
      type: 'string',
      description: 'Title at the firm, e.g. "Managing Partner"',
    }),
    defineField({
      name: 'photo',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'shortBio',
      title: 'Short Bio',
      type: 'text',
      rows: 3,
      description: 'One or two sentences, shown in the team grid',
    }),
    defineField({
      name: 'bio',
      title: 'Full Bio',
      type: 'array',
      // Same members as a section body: a migrated bio brings its own images and links.
      of: bodyMembers,
      description: 'Shown on the attorney’s own page',
    }),
    defineField({
      name: 'email',
      type: 'string',
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: 'phone',
      type: 'string',
    }),
    defineField({
      name: 'seo',
      type: 'seo',
      title: 'SEO & Social',
    }),
    wordpressIdField,
  ],
  preview: {
    select: {
      title: 'name',
      role: 'role',
      language: 'language',
      media: 'photo',
    },
    prepare({title, role, language, media}) {
      return {
        title: title || 'Unnamed Attorney',
        subtitle: [language?.toUpperCase() ?? 'No language', role].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
