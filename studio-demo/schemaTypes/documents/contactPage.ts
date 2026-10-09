import {defineField, defineType} from 'sanity'
import {HomeIcon} from '@sanity/icons/Home'
import {languageField} from '../fields/shared'
import {sectionMembers} from '../sections'

/**
 * The site's contact page. A singleton per language: the desk structure opens one fixed document
 * for each ("Contact Page", "Contact Page (Spanish)") and sanity.config.ts hides it from the
 * "new document" menu, so there is never a second one to pick between.
 */
export const contactPageType = defineType({
  name: 'contactPage',
  title: 'Contact Page',
  type: 'document',
  icon: HomeIcon,
  fields: [
    languageField,

    defineField({
      name: 'title',
      type: 'string',
      description: 'Only for the editor and the browser tab fallback',
      initialValue: 'Contact',
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
      title: title || 'Contact Us',
      subtitle: language?.toUpperCase() ?? 'No language',
    }),
  },
})
