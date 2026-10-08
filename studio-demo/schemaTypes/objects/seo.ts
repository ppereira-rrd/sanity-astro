import {defineArrayMember, defineField, defineType} from 'sanity'

export const seo = defineType({
  name: 'seo',
  title: 'SEO & Social',
  type: 'object',

  fields: [
    defineField({
      name: 'metaTitle',
      type: 'string',
      title: 'Meta Title',
    }),

    defineField({
      name: 'metaDescription',
      type: 'text',
      title: 'Meta Description',
      rows: 3,
    }),

    defineField({
      name: 'canonicalUrl',
      type: 'url',
      title: 'Canonical URL',
    }),

    defineField({
      name: 'ogImage',
      type: 'image',
      title: 'Social / Open Graph Image',
      options: {
        hotspot: true,
      },
    }),

    defineField({
      name: 'jsonLd',
      type: 'array',
      title: 'Structured Data (JSON-LD)',
      description:
        'Custom schema.org markup for this page only. Add one block per schema, e.g. LocalBusiness or Article.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'jsonLdBlock',
          fields: [
            defineField({
              name: 'label',
              type: 'string',
              title: 'Label',
              description: 'Only for the editor, e.g. "Local business"',
            }),

            defineField({
              name: 'json',
              type: 'text',
              title: 'JSON-LD',
              description:
                'Paste the JSON only, without <script> tags. It must include "@context" and "@type".',
              rows: 10,
              validation: (rule) =>
                rule.required().custom((value) => {
                  if (!value) return true

                  try {
                    const parsed = JSON.parse(value)

                    if (typeof parsed !== 'object' || parsed === null) {
                      return 'JSON-LD must be an object or an array of objects'
                    }

                    const items = Array.isArray(parsed) ? parsed : [parsed]
                    const valid = items.every((item) => item && item['@context'] && item['@type'])

                    return valid || 'Every object needs "@context" and "@type"'
                  } catch (error) {
                    return `Invalid JSON: ${(error as Error).message}`
                  }
                }),
            }),
          ],
          preview: {
            select: {label: 'label', json: 'json'},

            prepare({label, json}) {
              let type = ''

              try {
                const parsed = JSON.parse(json)
                type = [].concat(Array.isArray(parsed) ? parsed.map((p) => p['@type']) : parsed['@type']).join(', ')
              } catch {
                // Invalid JSON is flagged by validation; fall back to the label.
              }

              return {title: label || type || 'JSON-LD', subtitle: label ? type : undefined}
            },
          },
        }),
      ],
    }),

    defineField({
      name: 'noIndex',
      type: 'boolean',
      title: 'No Index',
      initialValue: false,
    }),
  ],
})
