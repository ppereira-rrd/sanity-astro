import {defineField, defineType} from 'sanity'
import {bodyMembers, languageField, sameLanguageFilter, wordpressIdField} from '../fields/shared'
import {sectionMembers} from '../sections'

export const postType = defineType({
  name: 'post',
  title: 'Post',
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
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'category'}],
      options: {filter: sameLanguageFilter},
    }),
    defineField({
      name: 'seo',
      type: 'seo',
      title: 'SEO & Social',
    }),
    defineField({
      name: 'body',
      type: 'array',
      of: bodyMembers,
    }),
    defineField({
      name: 'sections',
      type: 'array',
      title: 'Page Sections',
      description:
        'Rendered after the body \u2014 use these to pull in case results, attorneys, or a CTA',
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
        title: title || 'Untitled Post',
        subtitle: language?.toUpperCase() ?? 'No language',
      }
    },
  },
})
