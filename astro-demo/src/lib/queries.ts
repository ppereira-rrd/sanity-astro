/**
 * Every GROQ query the site runs. Pages and components import the ones they need and pass
 * parameters (`$slug`, `$id`) to `sanityClient.fetch`, so a change to the content model is
 * a change in this one file.
 */

/**
 * Projection for a document's `sections`. Keeps every field, and expands the case result
 * references into the documents they point at — without it a section would carry `{_ref}`
 * stubs and render empty.
 */
const SECTIONS = `sections[]{
  ...,
  _type == "caseResultSection" => {
    ...,
    caseResults[]->{ _id, title, amount, caseType, resultType, year, county, summary }
  }
}`;

/** Sitewide settings for `$id` and the English fallback, in one round trip. */
export const SITE_SETTINGS_QUERY = `*[_id in [$id, "siteSettings-en"]]`;

/** The home page singleton, looked up by its fixed `$id` (`homePage-en` / `homePage-es`). */
export const HOME_PAGE_QUERY = `*[_id == $id][0]{ ..., ${SECTIONS} }`;

/** One page by `$slug`. */
export const PAGE_QUERY = `*[
  _type == "page" &&
  basic.slug.current == $slug
][0]{ ..., ${SECTIONS} }`;

export const PAGE_SLUGS_QUERY = `*[
  _type == "page" &&
  defined(basic.slug.current)
]{
  "params": {
    "slug": basic.slug.current
  }
}`;

/** One post by `$slug`. `basic.author` is a reference, so it is dereferenced for the name and bio. */
export const POST_QUERY = `*[
  _type == "post" &&
  basic.slug.current == $slug
][0]{
  ...,
  ${SECTIONS},
  basic {
    ...,
    author->{name, bio}
  }
}`;

export const POST_SLUGS_QUERY = `*[
  _type == "post" &&
  defined(basic.slug.current)
]{
  "params": {
    "slug": basic.slug.current
  }
}`;

/** The twelve newest posts, flattened out of `basic` for the list. */
export const POSTS_QUERY = `*[
  _type == "post"
  && defined(basic.slug.current)
]|order(basic.publishedAt desc)[0...12]{
  _id,
  "title": basic.title,
  "slug": basic.slug,
  "excerpt": basic.excerpt,
  "publishedAt": basic.publishedAt,
  "featuredImage": basic.featuredImage
}`;

/** One attorney by `$slug`. */
export const ATTORNEY_QUERY = `*[
  _type == "attorney" &&
  slug.current == $slug
][0]{ ..., ${SECTIONS} }`;

export const ATTORNEY_SLUGS_QUERY = `*[
  _type == "attorney" &&
  defined(slug.current)
]{
  "params": { "slug": slug.current }
}`;

/** English (or language-less) attorneys, alphabetical, for the team grid. */
export const ATTORNEYS_QUERY = `*[
  _type == "attorney"
  && defined(slug.current)
  && (language == "en" || !defined(language))
]|order(name asc){
  _id,
  name,
  "slug": slug.current,
  role,
  photo
}`;

/** Redirect pairs, read by astro.config.mjs when the config loads. */
export const REDIRECTS_QUERY = `*[_type == "redirect"]{
  "from": from.current,
  "to": to.current
}`;
