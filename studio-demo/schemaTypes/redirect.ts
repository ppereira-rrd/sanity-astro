// Docs for redirects
// https://www.sanity.io/docs/developer-guides/managing-redirects-with-sanity
import { defineType, defineField, type SlugRule } from 'sanity'
// Shared validation for our redirect slugs
const slugValidator = (rule: SlugRule) =>
  rule.required().custom((value) => {
    if (!value || !value.current) return "Can't be blank";
    if (!value.current.startsWith("/")) {
      return "The path must start with a /";
    }
    return true;
  });
  
export const redirectType = defineType({
    name: 'redirect',
    title: 'Redirect',
    type: 'document',
    description: 'Redirect for astro.config',
    fields: [
        defineField({
            name: 'from',
            type: 'slug',
            validation: (rule) => slugValidator(rule),
        }),
        defineField({
            name: 'to',
            type: 'slug',
            validation: (rule) => slugValidator(rule),
        })
    ],
})