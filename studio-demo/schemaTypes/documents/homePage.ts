import {defineField, defineType} from 'sanity'
import {HomeIcon} from '@sanity/icons/Home'
import {languageField} from '../fields/shared'
import {sectionMembers} from '../sections'

/**
 * The site's home page. A singleton per language: the desk structure opens one fixed document
 * for each ("Home Page", "Home Page (Spanish)") and sanity.config.ts hides it from the
 * "new document" menu, so there is never a second one to pick between.
 */
export const homePageType = defineType({
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  icon: HomeIcon,
  fields: [
    languageField,

    defineField({
      name: 'title',
      type: 'string',
      description: 'Only for the editor and the browser tab fallback',
      initialValue: 'Home',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'seo',
      type: 'seo',
      title: 'SEO & Social',
    }),

    defineField({
      name: 'sections',
      type: 'array',
      title: 'Page Sections',
      of: sectionMembers,
    }),
  ],
  preview: {
    select: {title: 'title', language: 'language'},
    prepare: ({title, language}) => ({
      title: title || 'Home Page',
      subtitle: language?.toUpperCase() ?? 'No language',
    }),
  },
})
