import {defineField, defineType} from 'sanity'

export const postType = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    defineField({
      name: 'basic',
      type: 'basicFields',
      title: 'Basic Information',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'category'}],
    }),
    defineField({
      name: 'seo',
      type: 'seo',
      title: 'SEO & Social',
    }),
    defineField({
      name: 'body',
      type: 'array',
      of: [{type: 'block'}],
    }),
  ],
  // Because basicFields is used instead of defining the fields in every page/post type
  // a preview is need like the below so it looks proper on sanity. 
  preview: {
  select: {
    title: 'basic.title',
  },

  prepare({ title }) {
    return {
      title: title || 'Untitled Page',
    }
  },
},
})
