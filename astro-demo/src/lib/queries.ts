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
/** The about page singleton, looked up by its fixed `$id` (`aboutPage-en` / `aboutPage-es`). */
export const ABOUT_PAGE_QUERY = `*[_id == $id][0]{ ..., ${SECTIONS} }`;
/** The contact page singleton, looked up by its fixed `$id` (`contactPage-en` / `contactPage-es`). */
export const CONTACT_PAGE_QUERY = `*[_id == $id][0]{ ..., ${SECTIONS} }`;

/**
 * One page by `$slug` in `$language`. The English and Spanish versions of a page can share a
 * slug (the migration strips the language prefix), so the language has to be part of the match.
 */
export const PAGE_QUERY = `*[
  _type == "page" &&
  language == $language &&
  basic.slug.current == $slug
][0]{ ..., ${SECTIONS} }`;

/** The slugs of every page in `$language`. */
export const PAGE_SLUGS_QUERY = `*[
  _type == "page" &&
  language == $language &&
  defined(basic.slug.current)
]{
  "params": {
    "slug": basic.slug.current
  }
}`;

/** One post by `$slug` in `$language`. `basic.author` is a reference, so it is dereferenced for the name and bio. */
export const POST_QUERY = `*[
  _type == "post" &&
  language == $language &&
  basic.slug.current == $slug
][0]{
  ...,
  ${SECTIONS},
  basic {
    ...,
    author->{name, bio}
  }
}`;

/** The slugs of every post in `$language`. */
export const POST_SLUGS_QUERY = `*[
  _type == "post" &&
  language == $language &&
  defined(basic.slug.current)
]{
  "params": {
    "slug": basic.slug.current
  }
}`;

/** The twelve newest posts in `$language`, flattened out of `basic` for the list. */
export const POSTS_QUERY = `*[
  _type == "post"
  && language == $language
  && defined(basic.slug.current)
]|order(basic.publishedAt desc)[0...12]{
  _id,
  "title": basic.title,
  "slug": basic.slug,
  "excerpt": basic.excerpt,
  "publishedAt": basic.publishedAt,
  "featuredImage": basic.featuredImage
}`;

/** One attorney by `$slug` in `$language`. */
export const ATTORNEY_QUERY = `*[
  _type == "attorney" &&
  language == $language &&
  slug.current == $slug
][0]{ ..., ${SECTIONS} }`;

/** The slugs of every attorney in `$language`. */
export const ATTORNEY_SLUGS_QUERY = `*[
  _type == "attorney" &&
  language == $language &&
  defined(slug.current)
]{
  "params": { "slug": slug.current }
}`;

/** Attorneys in `$language`, alphabetical, for the team grid. */
export const ATTORNEYS_QUERY = `*[
  _type == "attorney"
  && defined(slug.current)
  && language == $language
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
