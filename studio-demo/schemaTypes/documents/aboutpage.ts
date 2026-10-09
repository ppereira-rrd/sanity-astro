import {defineField, defineType} from 'sanity'
import {HomeIcon} from '@sanity/icons/Home'
import {languageField} from '../fields/shared'
import {sectionMembers} from '../sections'

/**
 * The site's about page. A singleton per language: the desk structure opens one fixed document
 * for each ("About Page", "About Page (Spanish)") and sanity.config.ts hides it from the
 * "new document" menu, so there is never a second one to pick between.
 */
export const aboutPageType = defineType({
  name: 'aboutPage',
  title: 'About Page',
  type: 'document',
  icon: HomeIcon,
  fields: [
    languageField,

    defineField({
      name: 'title',
      type: 'string',
      description: 'Only for the editor and the browser tab fallback',
      initialValue: 'About',
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
      title: title || 'About Us',
      subtitle: language?.toUpperCase() ?? 'No language',
    }),
  },
})
