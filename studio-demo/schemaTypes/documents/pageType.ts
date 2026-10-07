import {defineField, defineType} from 'sanity'
import {bodyMembers, languageField, wordpressIdField} from '../fields/shared'
import {sectionMembers} from '../sections'

export const pageType = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',

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
      name: 'seo',
      type: 'seo',
      title: 'SEO & Social',
    }),

    defineField({
      name: 'body',
      type: 'array',
      title: 'Body',
      description: 'Rendered before the sections \u2014 holds the prose migrated from WordPress',
      of: bodyMembers,
    }),

    defineField({
      name: 'sections',
      type: 'array',
      title: 'Page Sections',
      of: sectionMembers,
    }),

    wordpressIdField,
  ],
  // Because basicFields is used instead of defining the fields in every page/post type
  // a preview is need like the below so it looks proper on sanity.
  preview: {
    select: {
      title: 'basic.title',
      language: 'language',
    },

    prepare({title, language}) {
      return {
        title: title || 'Untitled Page',
        subtitle: language?.toUpperCase() ?? 'No language',
      }
    },
  },
})
