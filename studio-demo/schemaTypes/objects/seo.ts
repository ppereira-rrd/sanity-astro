import {defineField, defineType} from 'sanity'

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
      name: 'noIndex',
      type: 'boolean',
      title: 'No Index',
      initialValue: false,
    }),
  ],
})
