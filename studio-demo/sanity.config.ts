import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {documentInternationalization} from '@sanity/document-internationalization'
import {schemaTypes} from './schemaTypes'
import {supportedLanguages, translatedTypes, translationMetadataFields} from './schemaTypes/fields/shared'

export default defineConfig({
  name: 'default',
  title: 'Demo',

  projectId: 'igodg8qe',
  dataset: 'production',

  plugins: [
    structureTool(),
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
    newDocumentOptions: (prev) =>
      prev.filter(
        (template) => !(translatedTypes as readonly string[]).includes(template.templateId),
      ),
  },
})
