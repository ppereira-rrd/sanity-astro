import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {documentInternationalization} from '@sanity/document-internationalization'
import {schemaTypes} from './schemaTypes'
import {singletonTemplates, singletonTypes, structure} from './structure'
import {supportedLanguages, translatedTypes, translationMetadataFields} from './schemaTypes/fields/shared'

export default defineConfig({
  name: 'SSCM',
  title: 'Sanity Studio Client Migration',

  projectId: 'igodg8qe',
  dataset: 'production',

  /**
   * Content Releases: group changes to posts and pages into a release and publish them
   * together, or schedule the release. On by default in Studio 3.77+, stated here so it is a
   * decision rather than an accident. There is no per-type switch: it applies to every
   * document type that has drafts, which includes `post` and `page`.
   */
  releases: {
    enabled: true,
  },

  plugins: [
    structureTool({structure}),
    visionTool(),
    documentInternationalization({
      supportedLanguages: [...supportedLanguages],
      // Every document type that gets one document per language.
      schemaTypes: [...translatedTypes],
      metadataFields: translationMetadataFields,
    }),
  ],

  schema: {
    types: schemaTypes,
    templates: (prev) => [...prev, ...singletonTemplates],
  },

  document: {
    /**
     * documentInternationalization() registers a per-language template for each
     * translated type ("English Case Result", "Spanish Case Result"), but Sanity's
     * own language-less template ("Case Result") stays in the menu too. A document
     * created from it has no `language`, and because the field is hidden and
     * read-only there's no way to set one in the form — it can never be translated.
     * Drop those templates so only the language-specific options are offered.
     */
    // https://www.sanity.io/docs/studio/localization
    newDocumentOptions: (prev) =>
      prev.filter(
        (template) =>
          !(translatedTypes as readonly string[]).includes(template.templateId) &&
          // Singletons are opened from the desk structure, never created from the menu.
          !(singletonTypes as readonly string[]).includes(template.templateId) &&
          !singletonTemplates.some((single) => single.id === template.templateId),
      ),
  },
})
