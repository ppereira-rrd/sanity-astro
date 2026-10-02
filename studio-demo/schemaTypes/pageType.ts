import {defineField, defineType} from 'sanity'

export const pageType = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',

  fields: [
    defineField({
      name: 'basic',
      type: 'basicFields',
      title: 'Basic Information',
    }),

    defineField({
      name: 'seo',
      type: 'seo',
      title: 'SEO & Social',
    }),

    defineField({
      name: 'sections',
      type: 'array',
      title: 'Page Sections',
      of: [
        {type: 'heroSection'},
        {type: 'headingSection'},
        {type: 'ctaSection'},
        {type: 'faqSection'},
        {type: 'featureGridSection'},
        {type: 'testimonialSection'},
      ],
    }),
  ],
  // Because basicFields is used instead of defining the fields in every page/post type
  // a preview is need like the below so it looks proper on sanity.
  preview: {
    select: {
      title: 'basic.title',
    },

    prepare({title}) {
      return {
        title: title || 'Untitled Page',
      }
    },
  },
})
