import {defineField, defineType} from 'sanity'
import {StarIcon} from '@sanity/icons/Star'
import {languageField} from '../fields/shared'

/**
 * One document per language, linked as translations by the
 * document-internationalization plugin — use the language switcher at the top of
 * the document to move between the en and es versions.
 */
export const caseResultType = defineType({
  name: 'caseResult',
  title: 'Case Result',
  type: 'document',
  icon: StarIcon,
  fields: [
    languageField,
    defineField({
      name: 'title',
      type: 'string',
      description: 'Short headline, e.g. "Truck accident settlement"',
    }),
    defineField({
      name: 'amount',
      type: 'string',
      description: 'Displayed as entered, e.g. "$1.2M"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'caseType',
      type: 'string',
      description: 'Practice area or case type, e.g. "Personal Injury"',
    }),
    defineField({
      name: 'resultType',
      type: 'string',
      description: 'e.g. "Settlement" or "Verdict"',
    }),
    defineField({
      name: 'year',
      type: 'number',
      validation: (rule) => rule.integer().min(1900).max(2100),
    }),
    defineField({
      name: 'county',
      type: 'string',
      description: 'County the case was tried in, without the word "County" — e.g. "Harris"',
    }),
    defineField({
      name: 'summary',
      type: 'text',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      language: 'language',
      amount: 'amount',
      caseType: 'caseType',
    },
    prepare({title, language, amount, caseType}) {
      return {
        title: title || caseType || 'Untitled',
        subtitle: [language?.toUpperCase() ?? 'No language', amount, caseType]
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
})
