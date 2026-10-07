import {defineArrayMember, defineField} from 'sanity'

/**
 * The languages the studio translates into. Keep this in sync with the
 * `supportedLanguages` passed to documentInternationalization() in sanity.config.ts.
 */
export const supportedLanguages = [
  {id: 'en', title: 'English'},
  {id: 'es', title: 'Spanish'},
] as const

export const defaultLanguage = supportedLanguages[0].id

/**
 * Every document type that gets one document per language. Used both to configure
 * documentInternationalization() and to hide the language-less "new document"
 * template for those types — see `newDocumentOptions` in sanity.config.ts.
 */
export const translatedTypes = [
  'post',
  'page',
  'category',
  'caseResult',
  'attorney',
  'testimonial',
] as const

/**
 * Drop this into any translated document type. The document-internationalization
 * plugin writes the value when it creates a translation, so the field is read-only
 * in the form — use the language switcher at the top of the document instead.
 */
export const languageField = defineField({
  name: 'language',
  type: 'string',
  readOnly: true,
  hidden: true,
})

/**
 * Use on reference fields so editors can only point at documents in the same
 * language — an English post should link to the English category, not the
 * Spanish one. Documents that have no language yet fall back to an unfiltered
 * list so they stay editable until they're migrated.
 */
export const sameLanguageFilter = ({document}: {document: Record<string, unknown>}) => {
  const language = document?.language

  return typeof language === 'string' ? {filter: 'language == $language', params: {language}} : {}
}

/**
 * Set by scripts/migrate-wordpress.ts and never edited by hand. The migration
 * matches documents on it, so rerunning updates the same document instead of
 * creating a duplicate.
 */
export const wordpressIdField = defineField({
  name: 'wordpressId',
  title: 'WordPress ID',
  type: 'number',
  readOnly: true,
  hidden: true,
})

/**
 * The rich-text members pages and posts both use for their `body`. Inline images,
 * videos and buttons are what the WordPress migration lifts out of Elementor.
 */
export const bodyMembers = [
  defineArrayMember({type: 'block'}),
  defineArrayMember({
    type: 'image',
    options: {hotspot: true},
    fields: [
      defineField({
        name: 'alt',
        type: 'string',
        title: 'Alt Text',
      }),
      defineField({
        name: 'caption',
        type: 'string',
        title: 'Caption',
      }),
    ],
  }),
  defineArrayMember({type: 'video'}),
  defineArrayMember({type: 'button'}),
]
