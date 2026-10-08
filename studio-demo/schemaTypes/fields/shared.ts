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
  'videos',
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
 * The rich-text members every prose-carrying section uses. Inline images, videos
 * and buttons are what the WordPress migration lifts out of Elementor.
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

/**
 * Extra fields on the `translation.metadata` documents that link a document to its
 * translations. Polylang links carry none of them; scripts/migrate-wordpress.ts sets
 * `linkMethod: 'title-match'` on groups it paired by comparing translated titles, so an
 * admin can open the metadata, see how the link was made, and tick `verified` once a
 * person has confirmed the pair really is the same page.
 */
const autoMatchedOnly = ({document}: {document?: Record<string, unknown>}) =>
  document?.linkMethod !== 'title-match'

export const translationMetadataFields = [
  defineField({
    name: 'linkMethod',
    type: 'string',
    title: 'Linked by',
    description:
      'Polylang links were replayed from WordPress. "Title match" links were guessed by comparing translated titles — please verify them.',
    options: {
      list: [
        {title: 'Polylang', value: 'polylang'},
        {title: 'Title match (automatic)', value: 'title-match'},
        {title: 'Manual', value: 'manual'},
      ],
    },
    readOnly: true,
  }),

  defineField({
    name: 'verified',
    type: 'boolean',
    title: 'Verified by a person',
    description: 'Turn on once you have checked that these documents are really translations of each other.',
    initialValue: false,
    hidden: autoMatchedOnly,
  }),

  defineField({
    name: 'matchScore',
    type: 'number',
    title: 'Match score',
    description: 'Title similarity from 0 to 1 after translating the Spanish title into English.',
    readOnly: true,
    hidden: autoMatchedOnly,
  }),

  defineField({
    name: 'matchDetails',
    type: 'text',
    title: 'What was compared',
    rows: 4,
    readOnly: true,
    hidden: autoMatchedOnly,
  }),
]

/**
 * An admin-only explanation of how this document ended up linked, or not linked, to its
 * translation. Written by scripts/migrate-wordpress.ts, so it is read-only; editors who are
 * not administrators never see it.
 */
export const translationNoteField = defineField({
  name: 'translationNote',
  type: 'text',
  title: 'Translation link note',
  description: 'Admins only. Why this document is, or is not, linked to its translation.',
  rows: 4,
  readOnly: true,
  hidden: ({currentUser}) => !currentUser?.roles?.some((role) => role.name === 'administrator'),
})
