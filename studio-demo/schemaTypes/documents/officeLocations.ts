import {defineArrayMember, defineField, defineType} from 'sanity'
import {CogIcon} from '@sanity/icons/Cog'
import {languageField} from '../fields/shared'

/**
 * Office Locations. A singleton, opened from the desk structure as
 */
export const officeLocations = defineType({
  name: 'officeLocations',
  title: 'Office Locations',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({
              name: 'officeLocationName',
              type: 'string',
              title: 'Office Location Name',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'officeLocationEmail',
              type: 'string',
              validation: (rule) => rule.email(),
            }),
            defineField({
              name: 'officeLocationPhone',
              type: 'string',
            }),
            defineField({
              name: 'officeLocationAddress',
              type: 'string',
            }),
             defineField({
              name: 'officeLocationGoogleLink',
              type: 'string',
            }),
  ],
  preview: {
    select: {title: 'officeLocationName'},
    // prepare: ({title, language}) => ({
    //   title: title || 'Site Settings',
    //   subtitle: language?.toUpperCase() ?? 'No language',
    // }),
  },
})
