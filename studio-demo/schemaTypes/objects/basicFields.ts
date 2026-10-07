import {defineField, defineType} from 'sanity'

export const basicFields = defineType({
  name: 'basicFields',
  title: 'Basic Fields',
  type: 'object',

  fields: [
    // having title, slug and other fields nested in a defined type requires you to update
    // the query on other pages in astro in order to show the content
    // EX: see index and [slug] astro pages in the posts folder
    defineField({
      name: 'title',
      type: 'string',
      title: 'Title',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'slug',
      type: 'slug',
      title: 'URL Slug',
      options: {
        source: 'title',
        slugify: (input) =>
          input
            .toString()
            .toLowerCase()
            .trim()
            // Replace spaces with hyphens
            .replace(/\s+/g, '-')
            // Remove characters that aren't allowed
            .replace(/[^\w-]+/g, '')
            // Remove duplicate hyphens
            .replace(/--+/g, '-'),
      },
      validation: (rule) =>
        rule.required().custom((value) => {
          if (!value?.current) {
            return true
          }

          return value.current === value.current.toLowerCase() ? true : 'Slug must be lowercase'
        }),
    }),

    defineField({
      name: 'excerpt',
      type: 'text',
      title: 'Excerpt',
      rows: 3,
    }),

    defineField({
      name: 'publishedAt',
      type: 'datetime',
      title: 'Published Date',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{type: 'author'}],
      description: 'Who wrote this. Authors are shared across languages.',
    }),

    defineField({
      name: 'featuredImage',
      type: 'image',
      title: 'Featured Image',
      options: {
        hotspot: true,
      },
    }),
  ],
})
