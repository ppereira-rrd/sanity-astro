import {defineField, defineType} from 'sanity'
import {languageField, wordpressIdField} from '../fields/shared'

export const categoryType = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    // One document per language, linked as translations — use the language
    // switcher at the top of the document to move between en and es.
    languageField,
    defineField({
      name: 'title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    wordpressIdField,
  ],
  preview: {
    select: {
      title: 'title',
      language: 'language',
    },

    prepare({title, language}) {
      return {
        title: title || 'Untitled Category',
        subtitle: language?.toUpperCase() ?? 'No language',
      }
    },
  },
})
