import {defineArrayMember, defineField, defineType} from 'sanity'
import {CogIcon} from '@sanity/icons/Cog'
import {languageField} from '../fields/shared'

/**
 * Sitewide settings. A singleton per language, opened from the desk structure as
 * "Site Settings" and "Site Settings (Spanish)" — see structure.ts.
 */
export const siteSettingsType = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    languageField,

    defineField({
      name: 'siteName',
      type: 'string',
      title: 'Site Name',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'logo',
      type: 'image',
      options: {hotspot: true},
    }),

    defineField({
      name: 'seo',
      type: 'seo',
      title: 'Default SEO & Social',
      description: 'Used by any page that does not set its own',
    }),

    defineField({
      name: 'phone',
      type: 'string',
    }),

    defineField({
      name: 'email',
      type: 'string',
      validation: (rule) => rule.email(),
    }),

    defineField({
      name: 'socialLinks',
      type: 'array',
      title: 'Social Links',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'socialLink',
          fields: [
            defineField({name: 'platform', type: 'string', validation: (rule) => rule.required()}),
            defineField({name: 'url', type: 'url', validation: (rule) => rule.required()}),
          ],
          preview: {select: {title: 'platform', subtitle: 'url'}},
        }),
      ],
    }),

  ],
  preview: {
    select: {title: 'siteName', language: 'language'},
    prepare: ({title, language}) => ({
      title: title || 'Site Settings',
      subtitle: language?.toUpperCase() ?? 'No language',
    }),
  },
})
