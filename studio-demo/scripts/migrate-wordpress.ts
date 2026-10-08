/**
 * Migrates a WordPress site (Elementor + Polylang + Yoast) into Sanity.
 *
 *   npm run migrate:wordpress                                    # import everything this site has
 *   npm run migrate:wordpress -- --dry-run --limit 5             # convert only, write preview JSON
 *   npm run migrate:wordpress -- --site https://example.com      # a different client
 *   npm run migrate:wordpress -- --only post,page                # just these content types
 *   npm run migrate:wordpress -- --list                          # what this site exposes, then exit
 *   npm run migrate:wordpress -- --match-translations            # then pair untranslated en/es documents by title
 *   npm run migrate:wordpress -- --match-only --dry-run          # just the pairing, report only (needs ANTHROPIC_API_KEY)
 *
 * Clients do not all run the same content types: one has `videos`, another has `our_team` and
 * `case-result`, most have neither. Rather than hard-coding one site's shape, MIGRATIONS below
 * declares every type this script knows how to convert, and each run asks WordPress which of
 * them the site actually exposes (`wp/v2/types`) and skips the rest. Adding support for a new
 * client is a new entry in that array, not a new branch in the code.
 *
 * Translated types get one Sanity document per WordPress language, carrying `language`, and
 * Polylang's `translations` map is replayed as the `translation.metadata` documents the
 * document-internationalization plugin reads.
 *
 * Safe to rerun: every document is matched on `wordpressId`, authors on slug, images on their
 * source URL, and translation links on the documents they reference.
 */
import {randomUUID} from 'node:crypto'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {htmlToBlocks, type TypedObject} from '@portabletext/block-tools'
import {JSDOM} from 'jsdom'
import {createSchema, type ArraySchemaType, type ObjectSchemaType} from 'sanity'
import {getCliClient} from 'sanity/cli'
import {schemaTypes} from '../schemaTypes'
import {defaultLanguage, supportedLanguages, translatedTypes} from '../schemaTypes/fields/shared'

const DEFAULT_SITE = 'https://www.joestephenslaw.com'
const LANGUAGES = supportedLanguages.map((language) => language.id) as string[]

const args = process.argv.slice(2)
const flag = (name: string) => {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? undefined : args[index + 1]
}

const DRY_RUN = args.includes('--dry-run')
const LIST_ONLY = args.includes('--list')
const MATCH_TRANSLATIONS = args.includes('--match-translations') || args.includes('--match-only')
const MATCH_ONLY = args.includes('--match-only')
const MATCH_THRESHOLD = Number(flag('match-threshold')) || 0.8
const LIMIT = Number(flag('limit')) || Infinity
const SITE = (flag('site') ?? DEFAULT_SITE).replace(/\/+$/, '')
const WP_API = `${SITE}/wp-json/wp/v2`
// Used to rewrite the site's own absolute links as relative ones; `www.` either way.
const WP_HOSTS = (() => {
  const host = new URL(SITE).hostname
  return [host, host.startsWith('www.') ? host.slice(4) : `www.${host}`]
})()
/** `--only post,page` restricts the run; empty means everything the site exposes. */
const ONLY = new Set((flag('only') ?? '').split(',').map((name) => name.trim()).filter(Boolean))
const OUTPUT_DIR = join(process.cwd(), 'scripts', '.migration-output')

const client = getCliClient({apiVersion: '2026-10-01'})

/**
 * Compile the studio's real schema and reuse `textSection.body`, so the HTML deserializer
 * only ever emits blocks, images, videos and buttons a section actually allows. Keeping it
 * derived means a schema change can't silently drift from the migration.
 */
const schema = createSchema({name: 'migration', types: schemaTypes})
const textSectionSchema = schema.get('textSection') as ObjectSchemaType | undefined
const bodyType = textSectionSchema?.fields.find((field) => field.name === 'body')?.type as
  ArraySchemaType | undefined

if (!bodyType) {
  throw new Error('Could not resolve the `body` field on the `textSection` schema type')
}

// ---------------------------------------------------------------------------
// WordPress types (only the fields we use)
// ---------------------------------------------------------------------------

interface WpAuthor {
  id: number
  name: string
  slug: string
  description?: string
}

interface WpMedia {
  id: number
  source_url: string
  alt_text?: string
}

interface WpCategory {
  id: number
  name: string
  slug: string
  description?: string
  link?: string
  lang?: string
  translations?: Record<string, number>
}

interface WpPost {
  id: number
  date_gmt: string
  slug: string
  link: string
  lang?: string
  categories?: number[]
  /** One client's Spanish blog keeps its own taxonomy instead of `categories`. */
  'articulos-category'?: number[]
  translations?: Record<string, number>
  title: {rendered: string}
  excerpt: {rendered: string}
  content: {rendered: string}
  yoast_head_json?: {
    title?: string
    description?: string
    robots?: {index?: string}
  }
  _embedded?: {
    author?: WpAuthor[]
    'wp:featuredmedia'?: WpMedia[]
  }
}

/** Pages carry the same payload as posts, minus terms and plus their place in the tree. */
interface WpPage extends Omit<WpPost, 'categories'> {
  parent?: number
}

/**
 * The `videos` custom post type. Its body is empty — the pages are assembled from
 * Elementor templates — so the only thing worth lifting besides the usual metadata
 * is the embed URL Yoast records as `og_video`.
 */
interface WpVideo extends Omit<WpPost, 'categories'> {
  yoast_head_json?: WpPost['yoast_head_json'] & {og_video?: string}
}

/** The `our_team` custom post type: an attorney profile, body and all. */
type WpTeamMember = Omit<WpPost, 'categories'>

/**
 * The `case-result` custom post type. The money is in the title rather than a field,
 * and the practice area is a `case-type` term.
 */
interface WpCaseResult extends Omit<WpPost, 'categories'> {
  'case-type'?: number[]
}

/** Anything the generic runner can migrate: a WordPress object with an ID and a language. */
interface WpItem {
  id: number
  slug: string
  link: string
  lang?: string
  translations?: Record<string, number>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const key = () => Math.random().toString(36).slice(2, 14)

const decode = (html: string) =>
  (JSDOM.fragment(`<div>${html}</div>`).textContent ?? '').replace(/\s+/g, ' ').trim()

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * Some Yoast descriptions are a slug someone pasted into the wrong box
 * ("1377000-veredicto-a-favor-de-una-victima"). Never a usable excerpt, so ignore them.
 */
const looksLikeSlug = (text: string) => !/\s/.test(text.trim()) && text.includes('-')

/** The Yoast description, unless whoever filled it in put a slug there. */
const metaDescription = (yoast: {description?: string} = {}) =>
  yoast.description && !looksLikeSlug(yoast.description) ? yoast.description : ''

const truncate = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`

const writePreview = (filename: string, doc: unknown) => {
  mkdirSync(OUTPUT_DIR, {recursive: true})
  writeFileSync(join(OUTPUT_DIR, filename), JSON.stringify(doc, null, 2))
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const status = (error as {statusCode?: number}).statusCode
      const retryable = !status || status === 429 || status >= 500
      if (!retryable || attempt >= attempts) throw error
      const wait = 2000 * 2 ** (attempt - 1)
      console.warn(
        `  ↻ ${label} failed (${status ?? (error as Error).message}), retrying in ${wait / 1000}s`,
      )
      await sleep(wait)
    }
  }
}

/** Walks a paginated WordPress collection, stopping early once `limit` is reached. */
async function fetchAllPaged<T>(resource: string, query = '', limit = Infinity): Promise<T[]> {
  const items: T[] = []
  for (let page = 1; ; page++) {
    const response = await withRetry(`${resource} page ${page}`, () =>
      fetch(`${WP_API}/${resource}?per_page=100&page=${page}${query}`),
    )
    if (!response.ok) {
      throw new Error(`WordPress API ${response.status} on ${resource} page ${page}`)
    }
    items.push(...((await response.json()) as T[]))
    const totalPages = Number(response.headers.get('x-wp-totalpages') ?? 1)
    if (page >= totalPages || items.length >= limit) break
  }
  return items.slice(0, limit)
}

const EMBED = '&_embed=author,wp:featuredmedia'

/**
 * Which resources this site actually exposes. Clients differ — one publishes `videos`,
 * another `our_team` and `case-result` — so every run asks rather than assumes.
 *
 * Both endpoints are needed: `types` lists post types only, so a taxonomy like
 * `categories` is absent from it and would look like a site that has no categories.
 */
async function siteResources(): Promise<Set<string>> {
  const bases = await Promise.all(
    ['types', 'taxonomies'].map(async (endpoint) => {
      const response = await withRetry(endpoint, () => fetch(`${WP_API}/${endpoint}`))
      if (!response.ok) throw new Error(`WordPress API ${response.status} on ${endpoint}`)
      const entries = (await response.json()) as Record<string, {rest_base?: string}>
      return Object.values(entries).map((entry) => entry.rest_base)
    }),
  )

  return new Set(bases.flat().filter((base): base is string => Boolean(base)))
}

/**
 * Term ID → name, for the taxonomies a custom post type hangs its metadata on. Takes
 * the same candidate list as a content type, and a taxonomy the site doesn't expose
 * just means no label to attach.
 */
async function fetchTerms(resources: string[]): Promise<Map<number, string>> {
  for (const resource of resources) {
    try {
      const terms = await fetchAllPaged<{id: number; name: string}>(resource)
      if (terms.length) return new Map(terms.map((term) => [term.id, decode(term.name)]))
    } catch {
      // Try the next spelling.
    }
  }
  return new Map()
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

const assetCache = new Map<string, string>()

/** Uploads an image once (matched on its WordPress URL) and returns the Sanity asset ID. */
async function uploadImage(url: string): Promise<string | null> {
  const cleanUrl = url.split('?')[0]
  if (assetCache.has(cleanUrl)) return assetCache.get(cleanUrl)!
  if (DRY_RUN) {
    assetCache.set(cleanUrl, `image-dry-run-${assetCache.size}`)
    return assetCache.get(cleanUrl)!
  }

  const existing = await client.fetch<string | null>(
    `*[_type == "sanity.imageAsset" && source.url == $url][0]._id`,
    {url: cleanUrl},
  )
  if (existing) {
    assetCache.set(cleanUrl, existing)
    return existing
  }

  try {
    const response = await withRetry(`download ${cleanUrl}`, () => fetch(cleanUrl))
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    const asset = await withRetry(`upload ${cleanUrl}`, () =>
      client.assets.upload('image', buffer, {
        filename: decodeURIComponent(cleanUrl.split('/').pop() ?? 'image'),
        source: {name: 'wordpress', id: cleanUrl, url: cleanUrl},
      }),
    )
    assetCache.set(cleanUrl, asset._id)
    return asset._id
  } catch (error) {
    console.warn(`  ⚠ image skipped: ${cleanUrl} (${(error as Error).message})`)
    return null
  }
}

const imageField = (assetId: string, alt: string) => ({
  _type: 'image',
  asset: {_type: 'reference', _ref: assetId},
  alt,
})

// ---------------------------------------------------------------------------
// Elementor HTML → clean HTML
// ---------------------------------------------------------------------------

const TAKEAWAY_HEADING = /^(key takeaways?|puntos? claves?)$/i

/** Widgets that are site chrome (CTAs, buttons, maps, carousels) rather than article content. */
const DROPPED_WIDGETS = [
  'icon',
  'divider',
  'google_maps',
  'html',
  'nested-carousel',
  'uael-video-gallery',
  'template',
]

/** A call to action lifted out of Elementor, before its parts are uploaded/converted. */
interface RawCta {
  heading: string
  textHtml: string
  buttonText: string
  buttonUrl: string
  imageUrl: string | null
  imageAlt: string
}

/** A case result or testimonial lifted out of one page's own carousel. */
interface RawCaseResult {
  amount: string
  caseType: string
  resultType: string
  summary: string
}

interface RawTestimonial {
  quote: string
  name: string
}

interface CleanResult {
  html: string
  keyTakeaways: {heading: string; items: string[]} | null
  ctas: RawCta[]
  caseResults: RawCaseResult[]
  testimonials: RawTestimonial[]
  /** Pretty-printed `application/ld+json` blocks found in the content, ready for `seo.jsonLd`. */
  jsonLd: string[]
  dropped: string[]
}

/**
 * Pages carry their own schema.org markup as `<script type="application/ld+json">`. Only
 * blocks the studio would accept (valid JSON, every object with `@context` and `@type`) are
 * kept; anything else is reported through `dropped` rather than failing validation in Sanity.
 */
function extractJsonLd(doc: Document, dropped: string[]): string[] {
  const seen = new Set<string>()

  for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    const raw = (script.textContent ?? '').trim()
    if (!raw) continue

    try {
      const parsed = JSON.parse(raw)
      const items = Array.isArray(parsed) ? parsed : [parsed]
      if (!items.every((item) => item && typeof item === 'object' && item['@context'] && item['@type'])) {
        throw new Error('missing @context or @type')
      }
      seen.add(JSON.stringify(parsed, null, 2))
    } catch (error) {
      dropped.push(`JSON-LD (${(error as Error).message})`)
    }
  }

  return [...seen]
}

function renameElement(el: Element, tagName: string) {
  const replacement = el.ownerDocument.createElement(tagName)
  replacement.innerHTML = el.innerHTML
  el.replaceWith(replacement)
}

/** Links back to the old site become relative so they resolve on the new site. */
function toRelativeHref(href: string): string {
  const trimmed = href.trim()
  if (/^tel:/i.test(trimmed)) return `tel:${trimmed.slice(4).replace(/[^\d+]/g, '')}`
  try {
    const url = new URL(trimmed)
    if (!WP_HOSTS.includes(url.hostname)) return trimmed
    return `${url.pathname.replace(/\/$/, '') || '/'}${url.search}${url.hash}`
  } catch {
    // Relative, mailto: — leave as is.
    return trimmed
  }
}

const CONTAINER = '[data-element_type="container"]'
const BUTTON_WIDGET = '[data-widget_type^="button"]'
const HEADING_WIDGET = '[data-widget_type^="heading"]'
// Elementor records a container's background on the element itself.
const STYLED = '[data-settings*="background_background"]'

const flatten = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim()

/**
 * Walks out from a button widget to the outermost container that still only holds the
 * call to action. Elementor nests CTAs several containers deep, and each wrapper adds
 * layout rather than copy — so climbing stops as soon as a parent brings in real prose.
 *
 * `maxText` is the ceiling on how much copy a call to action may hold. Some layouts put
 * the button straight into the article's own container, and without the ceiling the
 * whole article would be mistaken for one enormous CTA.
 */
function ctaRoot(button: Element, maxText: number): Element | null {
  let node: Element | null = button.closest(CONTAINER)
  if (!node) return null

  let text = flatten(node.textContent).length
  if (text > maxText) return null

  for (;;) {
    const parent: Element | null = node.parentElement?.closest(CONTAINER) ?? null
    if (!parent) return node

    const parentText = flatten(parent.textContent).length
    if (parentText > maxText || parentText > text + 40) return node

    node = parent
    text = parentText
  }
}

/** Is this a designed block rather than a button dropped into the article flow? */
function hasDesignElement(root: Element): boolean {
  if (root.querySelector(HEADING_WIDGET)) return true
  if (root.matches(STYLED) || root.querySelector(STYLED)) return true
  // Icons are decorative SVGs; a raster image is artwork.
  return Array.from(root.querySelectorAll('img')).some(
    (img) => !/\.svg(\?|$)/i.test(img.getAttribute('src') ?? ''),
  )
}

/**
 * A container counts as a CTA when a button is paired with some design — a heading, a
 * background or artwork. Body copy comes along when it is there, but a bare button sitting
 * in the article flow is a plain `button` block instead.
 */
function extractCta(root: Element): RawCta | null {
  const button = root.querySelector(`a.elementor-button, ${BUTTON_WIDGET} a[href]`)
  const buttonUrl = button?.getAttribute('href')?.trim()
  const buttonText = flatten(button?.textContent)
  if (!buttonUrl || !buttonText) return null

  if (!hasDesignElement(root)) return null

  // Elementor renders heading widgets as whatever tag the editor picked, often a <p>.
  // Blocks that lead with artwork carry no heading at all, which the schema allows.
  const heading = flatten(
    root.querySelector(HEADING_WIDGET)?.textContent ??
      root.querySelector('h1, h2, h3, h4, h5, h6')?.textContent,
  )

  // Decorative icons sit alongside the real artwork, so take the largest non-SVG image.
  const image = Array.from(root.querySelectorAll('img'))
    .filter((img) => !/\.svg(\?|$)/i.test(img.getAttribute('src') ?? ''))
    .sort((a, b) => Number(b.getAttribute('width') ?? 0) - Number(a.getAttribute('width') ?? 0))[0]

  // The body copy is whatever is left once the heading, button and media are taken out.
  const clone = root.cloneNode(true) as Element
  clone
    .querySelectorAll(
      `${HEADING_WIDGET}, ${BUTTON_WIDGET}, a.elementor-button, h1, h2, h3, h4, h5, h6, img, figure`,
    )
    .forEach((el) => el.remove())
  clone.querySelectorAll('a[href]').forEach((a) => {
    a.setAttribute('href', toRelativeHref(a.getAttribute('href')!))
  })
  const textHtml = Array.from(clone.querySelectorAll('p, ul, ol'))
    // Nested lists and paragraphs come along inside their parent's outerHTML.
    .filter((el) => !el.parentElement?.closest('ul, ol'))
    .filter((el) => flatten(el.textContent))
    .map((el) => el.outerHTML)
    .join('')

  return {
    heading,
    textHtml,
    buttonText,
    buttonUrl: toRelativeHref(buttonUrl),
    imageUrl: image?.getAttribute('src')?.trim() || null,
    imageAlt: image?.getAttribute('alt')?.trim() || '',
  }
}

const CAROUSEL = '[data-widget_type^="nested-carousel"]'
const SLIDE = '.swiper-slide'
const WIDGET = '[data-widget_type]'

/** A heading that is nothing but money: "$9,600,000". The summary says "$9.6 million". */
const ONLY_AMOUNT = /^\$\s?[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|thousand))?$/i
const RESULT_WORD = /\b(verdict|settlement|recovery|veredicto|acuerdo)\b/i

/** The visible text of each widget in a slide, in document order, blanks removed. */
const slideParts = (slide: Element) =>
  Array.from(slide.querySelectorAll(WIDGET))
    .map((widget) => flatten(widget.textContent))
    .filter(Boolean)

/**
 * A carousel slide holding a case result: a standalone money heading, usually with the
 * result type and practice area beside it, and a paragraph of narrative.
 */
function extractCaseResult(parts: string[]): RawCaseResult | null {
  const amount = parts.find((part) => ONLY_AMOUNT.test(part))
  if (!amount) return null

  const rest = parts.filter((part) => part !== amount)
  // The narrative is the long one; everything else is a label.
  const summary = rest.reduce((longest, part) => (part.length > longest.length ? part : longest), '')
  const labels = rest.filter((part) => part !== summary)

  // Labels read "VERDICT", "Truck Accident", or both at once as "Car Accident Settlement".
  const withWord = labels.find((label) => RESULT_WORD.test(label))
  const resultWord = withWord ? RESULT_WORD.exec(withWord)![1] : ''
  const resultType = resultWord
    ? resultWord[0].toUpperCase() + resultWord.slice(1).toLowerCase()
    : ''
  const caseType =
    labels.find((label) => label !== withWord) ??
    flatten(withWord?.replace(RESULT_WORD, '')) ??
    ''

  return {amount, caseType, resultType, summary: summary.length > 40 ? summary : ''}
}

/**
 * A carousel slide holding a testimonial: a quote and a short attribution. A slide with
 * only prose and nobody's name is some other kind of carousel, and is left alone.
 */
function extractTestimonial(parts: string[]): RawTestimonial | null {
  if (parts.length < 2) return null
  const quote = parts.reduce((longest, part) => (part.length > longest.length ? part : longest), '')
  if (quote.length < 60) return null

  // An attribution is a name, not a sentence.
  const name = parts.find(
    (part) => part !== quote && part.length <= 60 && part.split(' ').length <= 5,
  )
  if (!name) return null

  return {quote, name}
}

function cleanElementorHtml(html: string): CleanResult {
  const doc = new JSDOM(`<body>${html}</body>`).window.document
  const dropped: string[] = []
  let keyTakeaways: CleanResult['keyTakeaways'] = null
  const ctas: RawCta[] = []
  const caseResults: RawCaseResult[] = []
  const testimonials: RawTestimonial[] = []

  // Read the structured data before the scripts are stripped below.
  const jsonLd = extractJsonLd(doc, dropped)

  doc.querySelectorAll('svg, script, style, noscript, form').forEach((el) => el.remove())

  // Key takeaways: a "KEY TAKEAWAYS" / "PUNTOS CLAVES" label followed by a list.
  for (const label of Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6, span, p, strong'))) {
    if (keyTakeaways || !TAKEAWAY_HEADING.test(label.textContent?.trim() ?? '')) continue
    const container = label.closest('[data-elementor-type="container"]')
    const widget = label.closest('.elementor-widget')
    const list =
      container?.querySelector('ul, ol') ?? widget?.nextElementSibling?.querySelector('ul, ol')
    if (!list) continue

    const items = Array.from(list.querySelectorAll(':scope > li'))
      .map((li) => (li.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    if (!items.length) continue

    const raw = label.textContent!.trim().toLowerCase()
    keyTakeaways = {
      heading: raw.startsWith('punto') ? 'Puntos clave' : 'Key takeaways',
      // keyTakeawaysSection caps the array at 10.
      items: items.slice(0, 10),
    }

    if (container) {
      container.remove()
    } else {
      list.closest('.elementor-widget')?.remove()
      widget?.remove()
    }
  }

  // Videos: Elementor keeps the URL in the widget's data-settings.
  doc.querySelectorAll('.elementor-widget-video').forEach((widget) => {
    try {
      const settings = JSON.parse(widget.getAttribute('data-settings') ?? '{}')
      const url = settings.youtube_url || settings.vimeo_url || settings.hosted_url?.url
      if (url) {
        const marker = doc.createElement('figure')
        marker.setAttribute('data-video-url', url)
        widget.replaceWith(marker)
        return
      }
    } catch {
      // Fall through to dropping it.
    }
    dropped.push('video (no URL)')
    widget.remove()
  })

  // Calls to action: a promo container built around a button widget. Lifted out before
  // the button widget itself is dropped below, and deduped because the same block is
  // often repeated down a page.
  /*
   * Carousels: a page builds its own case results and testimonials into one, so they
   * belong to this page alone rather than to the shared library. Taken before the CTA
   * pass so a carousel can't be swallowed as part of a promo block.
   */
  for (const carousel of Array.from(doc.querySelectorAll(CAROUSEL))) {
    const slides = Array.from(carousel.querySelectorAll(SLIDE))
    const parsed = slides.map((slide) => {
      const parts = slideParts(slide)
      const caseResult = extractCaseResult(parts)
      return caseResult
        ? ({kind: 'caseResult', caseResult} as const)
        : ({kind: 'testimonial', testimonial: extractTestimonial(parts)} as const)
    })

    // One carousel holds one kind of thing; a mixed read means the guess was wrong.
    const found = parsed.filter((slide) =>
      slide.kind === 'caseResult' ? true : Boolean(slide.testimonial),
    )
    if (!found.length) continue

    for (const slide of found) {
      if (slide.kind === 'caseResult') caseResults.push(slide.caseResult)
      else if (slide.testimonial) testimonials.push(slide.testimonial)
    }
    carousel.remove()
  }

  // A call to action is a sidebar next to the article, not the article itself.
  const maxCtaText = Math.max(800, Math.round(flatten(doc.body.textContent).length * 0.3))
  const seenCtas = new Set<string>()
  for (const button of Array.from(doc.querySelectorAll(BUTTON_WIDGET))) {
    // An earlier pass may have already taken this button's container out of the document.
    if (!button.isConnected) continue
    const root = ctaRoot(button, maxCtaText)
    const cta = root && extractCta(root)
    if (!root || !cta) continue

    const fingerprint = `${cta.heading}|${cta.buttonUrl}|${cta.textHtml}`
    if (!seenCtas.has(fingerprint)) {
      seenCtas.add(fingerprint)
      ctas.push(cta)
    }
    root.remove()
  }

  // Whatever buttons are left are standalone links in the article flow — the CTA pass
  // above already took the promo blocks. They keep their position in the body.
  doc.querySelectorAll(BUTTON_WIDGET).forEach((widget) => {
    const link = widget.querySelector('a[href]')
    const label = flatten(link?.textContent)
    const href = link?.getAttribute('href')?.trim()
    if (!label || !href) {
      dropped.push('button (no link)')
      widget.remove()
      return
    }
    const marker = doc.createElement('figure')
    marker.setAttribute('data-button-url', toRelativeHref(href))
    marker.setAttribute('data-button-label', label)
    widget.replaceWith(marker)
  })

  // Shared Elementor library templates left at this point are promo blocks, not article content.
  doc.querySelectorAll('[data-elementor-type="container"]').forEach((el) => {
    dropped.push(`template ${el.getAttribute('data-elementor-id')}`)
    el.remove()
  })

  for (const name of DROPPED_WIDGETS) {
    // Match on data-widget_type: some widgets' CSS class differs from their name (e.g. nested-carousel).
    doc.querySelectorAll(`[data-widget_type="${name}.default"]`).forEach((el) => {
      dropped.push(name)
      el.remove()
    })
  }

  // Accordions (<details>) become an H3 plus their content.
  doc.querySelectorAll('details').forEach((details) => {
    const summary = details.querySelector('summary')
    const heading = doc.createElement('h3')
    heading.textContent = summary?.textContent?.trim() ?? ''
    summary?.remove()
    details.replaceWith(heading, ...Array.from(details.childNodes))
  })

  // The schema's block type allows H2–H4.
  doc.querySelectorAll('h1').forEach((el) => renameElement(el, 'h2'))
  doc.querySelectorAll('h5, h6').forEach((el) => renameElement(el, 'h4'))

  doc.querySelectorAll('a[href]').forEach((a) => {
    a.setAttribute('href', toRelativeHref(a.getAttribute('href')!))
  })

  return {html: doc.body.innerHTML, keyTakeaways, ctas, caseResults, testimonials, jsonLd, dropped}
}

// ---------------------------------------------------------------------------
// Clean HTML → Portable Text
// ---------------------------------------------------------------------------

async function htmlToBody(html: string, postTitle: string): Promise<TypedObject[]> {
  // Upload images first: deserializer rules are synchronous.
  const doc = new JSDOM(`<body>${html}</body>`).window.document
  const imageAssets = new Map<string, string | null>()
  for (const img of Array.from(doc.querySelectorAll('img'))) {
    const src = img.getAttribute('src')
    if (src && !src.startsWith('data:') && !imageAssets.has(src)) {
      imageAssets.set(src, await uploadImage(src))
    }
  }

  const blocks = htmlToBlocks(html, bodyType!, {
    parseHtml: (input) => new JSDOM(input).window.document,
    rules: [
      {
        deserialize(node, _next, createBlock) {
          // Element nodes only — text and comment nodes fall through to the defaults.
          if (node.nodeType !== 1) return undefined
          const element = node as Element
          const tag = element.tagName.toLowerCase()

          if (tag === 'figure' && element.hasAttribute('data-button-url')) {
            return createBlock({
              _type: 'button',
              label: element.getAttribute('data-button-label'),
              url: element.getAttribute('data-button-url'),
            }) as never
          }

          if (tag === 'figure' && element.hasAttribute('data-video-url')) {
            return createBlock({
              _type: 'video',
              url: element.getAttribute('data-video-url'),
              title: postTitle,
            }) as never
          }

          const img =
            tag === 'img' ? element : tag === 'figure' ? element.querySelector('img') : null
          if (img) {
            const assetId = imageAssets.get(img.getAttribute('src') ?? '')
            // An image we could not download is dropped rather than left as a broken reference.
            if (!assetId) return [] as never
            const caption =
              tag === 'figure'
                ? element.querySelector('figcaption')?.textContent?.trim()
                : undefined
            return createBlock({
              ...imageField(assetId, img.getAttribute('alt')?.trim() || postTitle),
              ...(caption ? {caption} : {}),
            }) as never
          }
          return undefined
        },
      },
    ],
  })

  // Drop empty paragraphs left behind by layout markup.
  return blocks.filter((block) => {
    if (block._type !== 'block') return true
    const children = (block as {children?: Array<{text?: string}>}).children ?? []
    return children.some((child) => child.text?.trim())
  }) as TypedObject[]
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

/**
 * Turns an extracted CTA into a `ctaSection`: uploads its image and converts its
 * copy to Portable Text. Pages and posts both take these in their `sections` array.
 */
async function ctaSection(cta: RawCta, fallbackAlt: string) {
  const assetId = cta.imageUrl ? await uploadImage(cta.imageUrl) : null
  const text = cta.textHtml ? await htmlToBody(cta.textHtml, cta.heading) : []

  return {
    _key: key(),
    _type: 'ctaSection',
    ...(cta.heading ? {heading: cta.heading} : {}),
    ...(text.length ? {text} : {}),
    ...(assetId ? {image: imageField(assetId, cta.imageAlt || fallbackAlt)} : {}),
    buttonText: cta.buttonText,
    buttonUrl: cta.buttonUrl,
  }
}

/** `headingSection` only offers h2–h6, so a stray h1 in the article body becomes an h2. */
const HEADING_LEVELS: Record<string, string> = {h1: 'h2', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6'}

const blockText = (block: TypedObject) =>
  flatten(
    ((block as {children?: Array<{text?: string}>}).children ?? [])
      .map((child) => child.text ?? '')
      .join(''),
  )

interface HeadingSection {
  _key: string
  _type: 'headingSection'
  heading: string
  headingLevel: string
  body: TypedObject[]
}

/**
 * Splits a converted article at its headings so each one becomes a `headingSection`
 * the editor can restyle or reorder on its own. Whatever runs before the first heading
 * has no heading to belong to, so it becomes a leading `textSection` — documents carry
 * no prose of their own, everything is a section.
 */
function splitAtHeadings(blocks: TypedObject[]) {
  const lead: TypedObject[] = []
  const sections: HeadingSection[] = []

  for (const block of blocks) {
    const style = block._type === 'block' ? (block as {style?: string}).style : undefined
    const level = style ? HEADING_LEVELS[style] : undefined
    const heading = level ? blockText(block) : ''

    if (level && heading) {
      sections.push({_key: key(), _type: 'headingSection', heading, headingLevel: level, body: []})
      continue
    }

    // An empty heading carries no text, so it is dropped rather than opening a section.
    if (level) continue

    ;(sections.length ? sections[sections.length - 1].body : lead).push(block)
  }

  return {
    lead,
    // `body` is optional on the section — omit it when a heading has no copy under it.
    sections: sections.map(
      ({body, ...section}): Omit<HeadingSection, 'body'> & {body?: TypedObject[]} =>
        body.length ? {...section, body} : section,
    ),
  }
}

/** Every block a document ended up with, across all of its sections. */
const allBlocks = (sections: Array<Record<string, unknown>>): TypedObject[] =>
  sections.flatMap((section) => (Array.isArray(section.body) ? (section.body as TypedObject[]) : []))

/**
 * The Elementor pipeline, shared by posts and pages: clean the markup, convert what is
 * left to Portable Text, and collect the blocks that become `sections`.
 */
async function convertContent(html: string, title: string) {
  const {html: clean, keyTakeaways, ctas, caseResults, testimonials, jsonLd, dropped} =
    cleanElementorHtml(html)
  const {lead, sections: headingSections} = splitAtHeadings(await htmlToBody(clean, title))

  // The whole document, in render order.
  const sections = [
    ...(keyTakeaways?.items.length
      ? [{_key: key(), _type: 'keyTakeawaysSection', ...keyTakeaways}]
      : []),
    ...(lead.length ? [{_key: key(), _type: 'textSection', body: lead}] : []),
    ...headingSections,
    // Written inline rather than as shared documents: a page's own carousel is its own.
    ...(caseResults.length
      ? [
          {
            _key: key(),
            _type: 'caseResultSection',
            caseResults: caseResults.map((result) => ({
              _key: key(),
              _type: 'caseResultItem',
              amount: result.amount,
              ...(result.caseType ? {caseType: result.caseType} : {}),
              ...(result.resultType ? {resultType: result.resultType} : {}),
              ...(result.summary ? {summary: result.summary} : {}),
            })),
          },
        ]
      : []),
    ...(testimonials.length
      ? [
          {
            _key: key(),
            _type: 'testimonialSection',
            testimonials: testimonials.map((testimonial) => ({
              _key: key(),
              _type: 'testimonialItem',
              quote: testimonial.quote,
              ...(testimonial.name ? {name: testimonial.name} : {}),
            })),
          },
        ]
      : []),
    ...(await Promise.all(ctas.map((cta) => ctaSection(cta, title)))),
  ]

  return {
    sections,
    keyTakeaways,
    ctas,
    caseResults,
    testimonials,
    jsonLd,
    lead,
    headingSections,
    dropped,
  }
}

const seoFields = (yoast: WpPost['yoast_head_json'] = {}, jsonLd: string[] = []) => ({
  _type: 'seo',
  ...(yoast.title ? {metaTitle: decode(yoast.title)} : {}),
  ...(yoast.description ? {metaDescription: yoast.description} : {}),
  ...(jsonLd.length
    ? {
        jsonLd: jsonLd.map((json) => ({_key: key(), _type: 'jsonLdBlock', ...labelFor(json), json})),
      }
    : {}),
  noIndex: yoast.robots?.index === 'noindex',
})

/** The editor-only label: the block's `@type`, so the list reads "FAQPage", "LocalBusiness"… */
function labelFor(json: string): {label?: string} {
  const parsed = JSON.parse(json)
  const types = (Array.isArray(parsed) ? parsed : [parsed]).flatMap((item) => item['@type'])
  return types.length ? {label: types.join(', ')} : {}
}

/** Documents already imported, so a rerun updates them instead of duplicating. */
async function existingIdsByWpId(type: string) {
  if (DRY_RUN) return new Map<number, string>()
  const docs = await client.fetch<Array<{_id: string; wordpressId: number}>>(
    `*[_type == $type && defined(wordpressId) && !(_id in path("drafts.**"))]{_id, wordpressId}`,
    {type},
  )
  return new Map(docs.map((doc) => [doc.wordpressId, doc._id]))
}

// ---------------------------------------------------------------------------
// Authors
// ---------------------------------------------------------------------------

/** Filled in by migrateCategories so posts can reference their category. */
let categoryIdByWpId = new Map<number, string>()

const authorIds = new Map<string, string>()

/** Authors are shared across languages, so they are matched on slug rather than wordpressId. */
async function authorRef(author: WpAuthor | undefined) {
  if (!author?.name) return undefined
  const slug = slugify(author.name)
  if (!authorIds.has(slug)) {
    if (DRY_RUN) {
      authorIds.set(slug, `author-dry-run-${slug}`)
    } else {
      let id = await client.fetch<string | null>(
        `*[_type == "author" && slug.current == $slug][0]._id`,
        {slug},
      )
      if (!id) {
        const created = await withRetry(`create author ${slug}`, () =>
          client.create({
            _type: 'author',
            name: author.name,
            slug: {_type: 'slug', current: slug},
            ...(author.description ? {bio: decode(author.description)} : {}),
          }),
        )
        id = created._id
        console.log(`  + author ${author.name}`)
      }
      authorIds.set(slug, id)
    }
  }
  return {_type: 'reference', _ref: authorIds.get(slug)!}
}

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

/**
 * Replays Polylang's `translations` map (language → WordPress ID) as the
 * `translation.metadata` documents the document-internationalization plugin reads.
 * Matched on the documents they reference, so reruns update instead of duplicating.
 */
async function linkTranslations(
  items: Array<{translations?: Record<string, number>}>,
  schemaType: string,
  idByWpId: Map<number, string>,
) {
  if (DRY_RUN) return
  const seen = new Set<string>()
  let linked = 0
  for (const item of items) {
    const members = Object.entries(item.translations ?? {})
      .filter(([language]) => LANGUAGES.includes(language))
      .map(([language, wpId]) => ({language, id: idByWpId.get(wpId)}))
      .filter((member): member is {language: string; id: string} => Boolean(member.id))
    if (members.length < 2) continue
    const groupKey = members
      .map((member) => member.id)
      .sort()
      .join('|')
    if (seen.has(groupKey)) continue
    seen.add(groupKey)

    const ids = members.map((member) => member.id)
    const metadataId = await client.fetch<string | null>(
      `*[_type == "translation.metadata" && count(translations[value._ref in $ids]) > 0][0]._id`,
      {ids},
    )
    const metadata = {
      _type: 'translation.metadata',
      schemaTypes: [schemaType],
      linkMethod: 'polylang',
      translations: members.map((member) => ({
        _key: key(),
        _type: 'internationalizedArrayReferenceValue',
        language: member.language,
        value: {_type: 'reference', _ref: member.id},
      })),
    }
    const id = metadataId ?? randomUUID()
    await withRetry(`link ${schemaType} translations`, () =>
      client.createOrReplace({...metadata, _id: id}),
    )
    linked++
  }
  console.log(`Linked ${linked} ${schemaType} translation groups`)
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/**
 * One Sanity document per WordPress term, carrying its Polylang language.
 * Terms without a language are skipped: the plugin can't place them in a translation group.
 *
 * Returns WordPress term ID → Sanity document ID so posts can reference their category.
 */
async function migrateCategories(
  report: Array<Record<string, unknown>>,
  available: Set<string>,
) {
  console.log(`${DRY_RUN ? '[dry run] ' : ''}Fetching WordPress categories…`)
  // A Spanish-only blog post type has its own taxonomy, so no `lang` to read: the taxonomy
  // says the language. Sites on Polylang report `lang`; sites without it fall back to the URL.
  const taxonomies: ResourceAlias[] = [
    'categories',
    {resource: 'articulos-category', language: 'es'},
  ].filter((alias) => available.has(aliasName(alias)))

  const categories: Array<WpCategory & {lang: string}> = []
  for (const alias of taxonomies) {
    const terms = await fetchAllPaged<WpCategory>(aliasName(alias))
    const hasPolylang = terms.some((term) => term.lang)
    for (const term of terms) {
      const path = term.link ? new URL(term.link).pathname : ''
      const lang =
        (typeof alias === 'string' ? undefined : alias.language) ??
        term.lang ??
        LANGUAGES.find((id) => id !== defaultLanguage && path.startsWith(`/${id}/`)) ??
        (hasPolylang ? undefined : defaultLanguage)
      if (lang && LANGUAGES.includes(lang)) categories.push({...term, lang})
    }
  }
  console.log(`Found ${categories.length} categories`)

  const existing = DRY_RUN
    ? new Map<number, string>()
    : new Map(
        (
          await client.fetch<Array<{_id: string; wordpressId: number}>>(
            `*[_type == "category" && defined(wordpressId) && !(_id in path("drafts.**"))]{_id, wordpressId}`,
          )
        ).map((doc) => [doc.wordpressId, doc._id]),
      )

  const idByWpId = new Map<number, string>()
  for (const category of categories) {
    const title = decode(category.name)
    // Polylang lets a translated term keep the original term's slug, so most Spanish
    // categories arrive as `motorcycle-accidents`. Only the default language keeps the
    // WordPress slug; a translation gets one built from its own title.
    const slug = category.lang === defaultLanguage ? category.slug : slugify(title)

    const doc = {
      _type: 'category',
      language: category.lang,
      title,
      slug: {_type: 'slug', current: slug},
      ...(category.description ? {description: decode(category.description)} : {}),
      wordpressId: category.id,
    }

    report.push({
      type: 'category',
      wordpressId: category.id,
      slug,
      wordpressSlug: category.slug,
      language: category.lang,
    })

    if (DRY_RUN) {
      // Placeholder IDs keep the post previews' category references readable.
      idByWpId.set(category.id, `category-dry-run-${category.lang}-${slug}`)
      writePreview(`category-${category.lang}-${slug}.json`, doc)
      continue
    }

    const id = existing.get(category.id) ?? randomUUID()
    await withRetry(`save category ${category.slug}`, () =>
      client.createOrReplace({...doc, _id: id}),
    )
    idByWpId.set(category.id, id)
  }

  await linkTranslations(categories, 'category', idByWpId)

  return idByWpId
}
// ---------------------------------------------------------------------------
// Content types
// ---------------------------------------------------------------------------

/**
 * A `rest_base` to look for, optionally pinned to a language — a Spanish-only post type
 * has no `lang` of its own, so the alias is the only thing that says what it holds.
 */
type ResourceAlias = string | {resource: string; language: string}

const aliasName = (alias: ResourceAlias) => (typeof alias === 'string' ? alias : alias.resource)

/** Everything the migration knows about one WordPress record. */
interface Built {
  doc: Record<string, unknown> & {_type: string; language?: string}
  /** Extra columns for this type's rows in _report.json. */
  report: Record<string, unknown>
}

/**
 * One WordPress content type and how it becomes a Sanity document. Adding support for a
 * client's custom post type means adding an entry to MIGRATIONS, not editing the runner.
 */
interface Migration<T extends WpItem> {
  /** What `--only` matches and what the logs call it. */
  name: string
  /**
   * `rest_base` candidates under wp/v2. The same content type is named differently from
   * client to client — `our_team` on one site, `attorneys` or `team` on the next — so a
   * run migrates every one of these the site exposes, not just the first. A site can have
   * two at once: cordiscosaile.com publishes English case results under `case-result` and
   * Spanish ones under `resultados_de_casos`. Those translated post types carry no Polylang
   * language, so the alias states it.
   */
  resources: ResourceAlias[]
  /** The Sanity document type. */
  type: string
  /** Polylang gives this type one document per language, and translations get linked. */
  translated: boolean
  slug: (item: T) => string
  /** Fetched once before the loop — taxonomy terms and the like. */
  prepare?: () => Promise<void>
  build: (item: T, slug: string, language: string) => Promise<Built>
}

/** title / slug / excerpt / publishedAt / author / featuredImage, shared by the page-like types. */
async function basicFields(item: WpPost, title: string, slug: string) {
  const media = item._embedded?.['wp:featuredmedia']?.[0]
  const featuredAssetId = media?.source_url ? await uploadImage(media.source_url) : null
  const excerpt = truncate(
    metaDescription(item.yoast_head_json) || decode(item.excerpt.rendered),
    300,
  )

  return {
    _type: 'basicFields',
    title,
    slug: {_type: 'slug', current: slug},
    ...(excerpt ? {excerpt} : {}),
    publishedAt: new Date(`${item.date_gmt}Z`).toISOString(),
    author: await authorRef(item._embedded?.author?.[0]),
    ...(featuredAssetId
      ? {featuredImage: imageField(featuredAssetId, media?.alt_text?.trim() || title)}
      : {}),
  }
}

/** The columns every converted article contributes to the report. */
const contentReport = (converted: Awaited<ReturnType<typeof convertContent>>) => {
  const blocks = allBlocks(converted.sections)
  return {
    blocks: blocks.length,
    headingSections: converted.headingSections.length,
    lede: converted.lead.length,
    keyTakeaways: converted.keyTakeaways?.items.length ?? 0,
    ctas: converted.ctas.length,
    caseResults: converted.caseResults.length,
    testimonials: converted.testimonials.length,
    jsonLd: converted.jsonLd.length,
    buttons: blocks.filter((block) => block._type === 'button').length,
    dropped: converted.dropped,
  }
}

/**
 * WordPress nests pages, and leaf slugs repeat across branches (`car-accident` lives under
 * several parents), so the slug is the full path with Polylang's language prefix removed.
 */
function pagePath(page: WpPage): string {
  const path = new URL(page.link).pathname.replace(/^\/+|\/+$/g, '')
  const prefix = `${page.lang}/`
  return (path.startsWith(prefix) ? path.slice(prefix.length) : path) || page.slug
}

/**
 * Case results put the money in the title rather than a field: "$200,000 Recovered for…",
 * or, on a Spanish post type, "Veredicto de 1,377,000 dólares a favor de…".
 */
const AMOUNT =
  /\$\s?[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|thousand|millones?))?|[\d,]+(?:\.\d+)?\s*(?:millones?\s*de\s*)?d[óo]lares/i

/** Most titles say "Recovered", which is neither — so these only fire when stated. */
const VERDICT = /verdicto|veredicto|verdict/i
const SETTLEMENT = /settle|acuerdo|arreglo/i
/** Yoast titles a profile "Name - Role | Firm", which is the only place the role appears. */
const ROLE = /\s[-–—]\s([^|]+?)\s*(?:\||$)/

/** Resolved in `prepare` so each case result can name its practice area. */
let caseTypeTerms = new Map<number, string>()

const MIGRATIONS: Array<Migration<never>> = [
  {
    name: 'posts',
    // `articulos` is one client's Spanish blog: a separate post type, so no Polylang to say so.
    resources: ['posts', {resource: 'articulos', language: 'es'}],
    type: 'post',
    translated: true,
    slug: (post: WpPost) => post.slug,
    async build(post: WpPost, slug: string, language: string) {
      const title = decode(post.title.rendered)
      const converted = await convertContent(post.content.rendered, title)

      // Posts carry several terms; Sanity's `category` holds one. Polylang keeps terms
      // per-language, so the first one that resolved is already the right language.
      const categoryId = [...(post.categories ?? []), ...(post['articulos-category'] ?? [])]
        .map((wpId) => categoryIdByWpId.get(wpId))
        .find((id): id is string => Boolean(id))

      return {
        doc: {
          _type: 'post',
          language,
          basic: await basicFields(post, title, slug),
          ...(categoryId ? {category: {_type: 'reference', _ref: categoryId}} : {}),
          seo: seoFields(post.yoast_head_json, converted.jsonLd),
          ...(converted.sections.length ? {sections: converted.sections} : {}),
          wordpressId: post.id,
        },
        report: {category: post.categories?.[0] ?? null, ...contentReport(converted)},
      }
    },
  } as unknown as Migration<never>,

  {
    name: 'pages',
    resources: ['pages'],
    type: 'page',
    translated: true,
    slug: (page: WpPage) => pagePath(page),
    async build(page: WpPage, slug: string, language: string) {
      const title = decode(page.title.rendered)
      const converted = await convertContent(page.content.rendered, title)

      return {
        doc: {
          _type: 'page',
          language,
          basic: await basicFields(page, title, slug),
          seo: seoFields(page.yoast_head_json, converted.jsonLd),
          ...(converted.sections.length ? {sections: converted.sections} : {}),
          wordpressId: page.id,
        },
        report: {parent: page.parent || null, ...contentReport(converted)},
      }
    },
  } as unknown as Migration<never>,

  {
    name: 'videos',
    resources: ['videos', 'video'],
    type: 'videos',
    // Polylang reports no language on any of them, so there is nothing to link.
    translated: false,
    slug: (video: WpVideo) => video.slug,
    async build(video: WpVideo, slug: string, language: string) {
      const title = decode(video.title.rendered)
      // Empty today, but convert it anyway so a transcript added in WordPress carries over.
      const {html: clean, jsonLd, dropped} = cleanElementorHtml(video.content.rendered)
      const transcript = await htmlToBody(clean, title)

      return {
        doc: {
          _type: 'videos',
          language,
          basic: await basicFields(video, title, slug),
          videoUrl: video.yoast_head_json?.og_video,
          ...(transcript.length ? {transcript} : {}),
          seo: seoFields(video.yoast_head_json, jsonLd),
          wordpressId: video.id,
        },
        report: {
          videoUrl: video.yoast_head_json?.og_video,
          transcript: transcript.length,
          dropped,
        },
      }
    },
  } as unknown as Migration<never>,

  {
    name: 'attorneys',
    resources: ['our_team', 'our-team', 'attorneys', 'attorney', 'team'],
    type: 'attorney',
    translated: false,
    slug: (member: WpTeamMember) => member.slug,
    async build(member: WpTeamMember, slug: string, language: string) {
      const name = decode(member.title.rendered)
      const yoast = member.yoast_head_json ?? {}
      // Same pipeline as pages and posts: headings become heading sections, prose text sections.
      const converted = await convertContent(member.content.rendered, name)

      const media = member._embedded?.['wp:featuredmedia']?.[0]
      const photoAssetId = media?.source_url ? await uploadImage(media.source_url) : null
      const role = flatten(ROLE.exec(decode(yoast.title ?? ''))?.[1])

      return {
        doc: {
          _type: 'attorney',
          language,
          name,
          slug: {_type: 'slug', current: slug},
          ...(role && role !== name ? {role} : {}),
          ...(photoAssetId ? {photo: imageField(photoAssetId, media?.alt_text?.trim() || name)} : {}),
          ...(yoast.description ? {shortBio: truncate(yoast.description, 300)} : {}),
          ...(converted.sections.length ? {sections: converted.sections} : {}),
          seo: seoFields(yoast, converted.jsonLd),
          wordpressId: member.id,
        },
        report: {role: role || null, photo: Boolean(photoAssetId), ...contentReport(converted)},
      }
    },
  } as unknown as Migration<never>,

  {
    name: 'case-results',
    resources: [
      'case-result',
      'case-results',
      'results',
      'result',
      {resource: 'resultados_de_casos', language: 'es'},
      {resource: 'resultados-de-casos', language: 'es'},
    ],
    type: 'caseResult',
    translated: false,
    slug: (result: WpCaseResult) => result.slug,
    prepare: async () => {
      caseTypeTerms = await fetchTerms(['case-type', 'case-types', 'case_type', 'practice-area'])
    },
    async build(result: WpCaseResult, slug: string, language: string) {
      const title = decode(result.title.rendered)
      const yoast = result.yoast_head_json ?? {}
      // Non-breaking spaces show up mid-title, so normalise before looking for the money.
      const amount = flatten(AMOUNT.exec(title.replace(/ /g, ' '))?.[0])
      const caseType = (result['case-type'] ?? [])
        .map((termId) => caseTypeTerms.get(termId))
        .find((name): name is string => Boolean(name))
      // The body's opening lines are a better summary than a slug in the Yoast box.
      const summary = truncate(
        metaDescription(yoast) ||
          decode(result.excerpt?.rendered ?? '') ||
          flatten(JSDOM.fragment(`<div>${result.content.rendered}</div>`).textContent),
        400,
      )

      return {
        doc: {
          _type: 'caseResult',
          language,
          title,
          ...(amount ? {amount} : {}),
          ...(caseType ? {caseType} : {}),
          // Kept in English on purpose: this classifies, so it has to group across languages.
          ...(VERDICT.test(title)
            ? {resultType: 'Verdict'}
            : SETTLEMENT.test(title)
              ? {resultType: 'Settlement'}
              : {}),
          year: new Date(`${result.date_gmt}Z`).getUTCFullYear(),
          ...(summary ? {summary} : {}),
          wordpressId: result.id,
        },
        report: {amount: amount || null, caseType: caseType ?? null, summary: summary.length},
      }
    },
  } as unknown as Migration<never>,
]

/**
 * Fetch, convert and save one content type. Everything that differs between types lives in
 * the MIGRATIONS entry; everything that doesn't — paging, the language filter, dry-run
 * previews, matching on `wordpressId`, translation links — happens here, once.
 */
async function runMigration<T extends WpItem>(
  migration: Migration<T>,
  alias: ResourceAlias,
  report: Array<Record<string, unknown>>,
) {
  const resource = aliasName(alias)
  // A language on the alias wins: a Spanish-only post type has no `lang` to read.
  const pinned = typeof alias === 'string' ? undefined : alias.language

  console.log(`${DRY_RUN ? '[dry run] ' : ''}Fetching WordPress ${migration.name} (${resource})…`)
  const all = await fetchAllPaged<T>(resource, EMBED, LIMIT)
  // Sites without Polylang report no `lang` at all; their language is only in the URL (`/es/…`).
  const languageOf = (item: WpItem) =>
    pinned ??
    item.lang ??
    LANGUAGES.find((id) => id !== defaultLanguage && new URL(item.link).pathname.startsWith(`/${id}/`)) ??
    defaultLanguage
  const hasPolylang = all.some((item) => item.lang)
  const items = migration.translated
    ? all.filter(
        (item) => pinned || !hasPolylang || LANGUAGES.includes(item.lang ?? ''),
      )
    : all
  const skipped = all.length - items.length
  console.log(
    `Found ${items.length} ${migration.name}${skipped ? ` (${skipped} skipped: no language)` : ''}`,
  )
  if (!items.length) return

  await migration.prepare?.()

  const existing = await existingIdsByWpId(migration.type)
  const idByWpId = new Map<number, string>()

  for (const [index, item] of items.entries()) {
    const slug = migration.slug(item)
    const language = languageOf(item)
    console.log(`[${index + 1}/${items.length}] ${language} ${slug}`)

    const {doc, report: row} = await migration.build(item, slug, language)

    report.push({
      type: migration.type,
      wordpressId: item.id,
      slug,
      language: doc.language,
      resource,
      ...row,
    })

    if (DRY_RUN) {
      writePreview(`${migration.type}-${doc.language}-${slug.replace(/\//g, '--')}.json`, doc)
      continue
    }

    // Pick the ID before saving so a retry after a dropped response overwrites instead of duplicating.
    const id = existing.get(item.id) ?? randomUUID()
    await withRetry(`save ${migration.type} ${slug}`, () =>
      client.createOrReplace({...doc, _id: id}),
    )
    idByWpId.set(item.id, id)
  }

  if (migration.translated) await linkTranslations(items, migration.type, idByWpId)
}

// ---------------------------------------------------------------------------
// Translations Polylang does not know about
// ---------------------------------------------------------------------------

/**
 * Some content types (and some individual pages) have a Spanish version that nothing links to
 * the English one. For those, translate the Spanish titles into English, compare them with the
 * English titles, and link the pairs that are nearly identical. The metadata documents are
 * marked `linkMethod: 'title-match'` with the score, so an admin can see in the studio that
 * an algorithm, not Polylang, made the link, and tick `verified` once a person has checked it.
 *
 * Only documents that are not in any translation group are considered, so Polylang's links
 * are never touched and a rerun only looks at what is still unlinked.
 */
const MATCHABLE_TYPES = translatedTypes.filter((type) => type !== 'testimonial')
const TITLE = 'coalesce(basic.title, title, name)'
const TRANSLATION_MODEL = 'claude-haiku-5-5'

/**
 * Category pairs already linked on another client's site (scripts/build-category-glossary.mjs).
 * A Spanish category found here is translated from the glossary, and the pairs also go to the
 * model as examples so its wording for the rest leans the same way.
 */
const GLOSSARY: Array<{en: string; es: string}> = (() => {
  const file = join(process.cwd(), 'scripts', 'data', 'category-translations.json')
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : []
})()

const glossaryKey = (title: string) =>
  title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
const glossaryEnglish = new Map(GLOSSARY.map((entry) => [glossaryKey(entry.es), entry.en]))

interface UnlinkedDoc {
  _id: string
  language: string
  title?: string
}

/** One batched call per 50 titles: Spanish in, English out, same order. */
async function translateTitles(titles: string[], examples: typeof GLOSSARY = []): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set; it is needed to translate titles')

  const out: string[] = []
  for (let start = 0; start < titles.length; start += 50) {
    const chunk = titles.slice(start, start + 50)
    const response = await withRetry('translate titles', async () => {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: TRANSLATION_MODEL,
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content:
                'Translate each Spanish web page title into natural English. Keep proper nouns and ' +
                'dollar amounts as they are. ' +
                (examples.length
                  ? `Established translations to stay consistent with: ${JSON.stringify(examples.map(({en, es}) => ({es, en})))}. `
                  : '') +
                'Reply with only a JSON array of strings, the same ' +
                `length and order as the input.\n\n${JSON.stringify(chunk)}`,
            },
          ],
        }),
      })
      if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`)
      return (await res.json()) as {content: Array<{type: string; text?: string}>}
    })

    const text = response.content.find((part) => part.type === 'text')?.text ?? ''
    const parsed = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1))
    if (!Array.isArray(parsed) || parsed.length !== chunk.length) {
      throw new Error(`Expected ${chunk.length} translated titles, got ${parsed?.length}`)
    }
    out.push(...parsed.map(String))
  }
  return out
}

const STOP_WORDS = new Set(['a', 'an', 'the', 'of', 'for', 'to', 'in', 'on', 'and', 'or', 'your', 'you', 'is', 'are'])

/** "Accidents" and "Accident" are the same word to a reader, so they should be to the score. */
const stem = (word: string) =>
  word.length < 4 || /(ss|us)$/.test(word)
    ? word
    : word.replace(/ies$/, 'y').replace(/(s|x|ch|sh)es$/, '$1').replace(/([^s])s$/, '$1')

const titleTokens = (title: string) =>
  new Set(
    title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word && !STOP_WORDS.has(word))
      .map(stem),
  )

/** Sørensen–Dice on the word sets: 1 for the same words in any order, 0 for nothing shared. */
function titleSimilarity(a: string, b: string): number {
  const left = titleTokens(a)
  const right = titleTokens(b)
  if (!left.size || !right.size) return 0
  let shared = 0
  for (const word of left) if (right.has(word)) shared++
  return (2 * shared) / (left.size + right.size)
}

async function matchUntranslated() {
  const report: Array<Record<string, unknown>> = []

  for (const type of MATCHABLE_TYPES) {
    const docs = await client.fetch<UnlinkedDoc[]>(
      `*[_type == $type && defined(language) && !(_id in path("drafts.**"))
          && !(_id in *[_type == "translation.metadata"].translations[].value._ref)]
        {_id, language, "title": ${TITLE}}`,
      {type},
    )
    const english = docs.filter((doc) => doc.language === defaultLanguage && doc.title)
    const spanish = docs.filter((doc) => doc.language === 'es' && doc.title)
    if (!english.length || !spanish.length) continue

    console.log(`Matching ${type}: ${spanish.length} Spanish against ${english.length} English`)
    const fromGlossary = type === 'category' ? spanish.map((doc) => glossaryEnglish.get(glossaryKey(doc.title!))) : []
    const pending = spanish.filter((_, index) => !fromGlossary[index])
    const modelOutput = pending.length
      ? await translateTitles(
          pending.map((doc) => doc.title!),
          type === 'category' ? GLOSSARY : [],
        )
      : []
    let next = 0
    const translated = spanish.map((_, index) => fromGlossary[index] ?? modelOutput[next++])

    const candidates = spanish
      .flatMap((es, index) =>
        english.map((en) => ({
          es,
          en,
          translated: translated[index],
          score: titleSimilarity(translated[index], en.title!),
        })),
      )
      .filter((pair) => pair.score >= 0.4)
      .sort((a, b) => b.score - a.score)

    // Best score first, one partner each: two Spanish pages never claim the same English one.
    const used = new Set<string>()
    for (const pair of candidates) {
      if (used.has(pair.es._id) || used.has(pair.en._id)) continue
      const linked = pair.score >= MATCH_THRESHOLD
      report.push({
        type,
        linked,
        score: Number(pair.score.toFixed(2)),
        spanish: pair.es.title,
        translated: pair.translated,
        english: pair.en.title,
      })
      if (!linked) continue
      used.add(pair.es._id)
      used.add(pair.en._id)

      if (DRY_RUN) continue
      await withRetry(`link ${type} ${pair.en.title}`, () =>
        client.create({
          _type: 'translation.metadata',
          schemaTypes: [type],
          linkMethod: 'title-match',
          verified: false,
          matchScore: Number(pair.score.toFixed(2)),
          matchDetails: `es: ${pair.es.title}\nes → en: ${pair.translated}\nen: ${pair.en.title}`,
          translations: [
            [defaultLanguage, pair.en._id],
            ['es', pair.es._id],
          ].map(([language, ref]) => ({
            _key: key(),
            _type: 'internationalizedArrayReferenceValue',
            language,
            value: {_type: 'reference', _ref: ref},
          })),
        }),
      )
    }

    const unmatched = spanish.filter((doc) => !used.has(doc._id)).length
    console.log(`  linked ${used.size / 2}, ${unmatched} Spanish left without a match`)
  }

  writePreview('_translation-matches.json', report)
  console.log(
    `Pairs at or above ${MATCH_THRESHOLD} are linked (${DRY_RUN ? 'dry run: not written' : 'written'}); ` +
      `closer misses are listed in ${join(OUTPUT_DIR, '_translation-matches.json')}`,
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Site: ${SITE}`)
  const available = await siteResources()

  // Every candidate name this site exposes, because a site can publish one content type
  // under two of them at once — English under one, Spanish under another.
  const resolved = MIGRATIONS.map((migration) => ({
    migration,
    aliases: migration.resources.filter((alias) => available.has(aliasName(alias))),
  }))

  const planned = resolved.filter(
    (entry) => entry.aliases.length && (!ONLY.size || ONLY.has(entry.migration.name)),
  )
  const unavailable = resolved.filter((entry) => !entry.aliases.length)

  console.log(
    `Migrating: ${planned.map((entry) => `${entry.migration.name} (${entry.aliases.map(aliasName).join(' + ')})`).join(', ') || 'nothing'}`,
  )
  if (unavailable.length) {
    console.log(
      `Not on this site: ${unavailable.map((entry) => `${entry.migration.name} (looked for ${entry.migration.resources.map(aliasName).join(', ')})`).join('; ')}`,
    )
  }
  if (LIST_ONLY) return

  if (MATCH_ONLY) {
    await matchUntranslated()
    return
  }

  const report: Array<Record<string, unknown>> = []

  // Categories first: posts reference them.
  if (available.has('categories') && planned.some((entry) => entry.migration.type === 'post')) {
    categoryIdByWpId = await migrateCategories(report, available)
  }

  for (const {migration, aliases} of planned) {
    for (const alias of aliases) {
      await runMigration(migration, alias, report)
    }
  }

  writePreview('_report.json', report)
  if (MATCH_TRANSLATIONS) await matchUntranslated()
  console.log(`Done. Report: ${join(OUTPUT_DIR, '_report.json')}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
