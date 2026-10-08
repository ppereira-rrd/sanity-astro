import type {StructureResolver} from 'sanity/structure'
import {HomeIcon} from '@sanity/icons/Home'
import {CogIcon} from '@sanity/icons/Cog'
import {supportedLanguages} from './schemaTypes/fields/shared'

/** Types opened as one fixed document per language instead of a list. */
export const singletonTypes = ['homePage', 'siteSettings'] as const

/** Content types, in the order they appear under "Content". */
const contentTypes = [
  'page',
  'post',
  'videos',
  'category',
  'caseResult',
  'attorney',
  'testimonial',
  'author',
]

/** One template per singleton and language, so the fixed document is created with `language` set. */
export const singletonTemplates = singletonTypes.flatMap((type) =>
  supportedLanguages.map((language) => ({
    id: `${type}-${language.id}`,
    title: `${type} (${language.title})`,
    schemaType: type,
    value: {language: language.id},
  })),
)

/** "Home Page" for the default language, "Home Page (Spanish)" for the others. */
const singletonItems = (S: Parameters<StructureResolver>[0], type: string, title: string, icon: typeof HomeIcon) =>
  supportedLanguages.map((language, index) =>
    S.listItem()
      .title(index === 0 ? title : `${title} (${language.title})`)
      .icon(icon)
      .id(`${type}-${language.id}`)
      .child(
        S.document()
          .schemaType(type)
          // A fixed ID per language so there is only ever one, and the language is already set.
          .documentId(`${type}-${language.id}`)
          .initialValueTemplate(`${type}-${language.id}`)
          .title(`${title} (${language.title})`),
      ),
  )

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Studio')
    .items([
      S.listItem()
        .title('Main')
        .child(S.list().title('Main').items(singletonItems(S, 'homePage', 'Home Page', HomeIcon))),

      S.listItem()
        .title('Content')
        .child(
          S.list()
            .title('Content')
            .items(
              contentTypes.map((type) => S.documentTypeListItem(type)),
            ),
        ),

      S.listItem()
        .title('Settings')
        .child(
          S.list()
            .title('Settings')
            .items([
              ...singletonItems(S, 'siteSettings', 'Site Settings', CogIcon),
              S.divider(),
              // Read by astro-demo/astro.config.mjs at build time.
              S.documentTypeListItem('redirect').title('Redirects'),
            ]),
        ),
    ])

