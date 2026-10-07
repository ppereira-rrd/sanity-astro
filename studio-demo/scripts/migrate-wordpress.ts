/**
 * Migrates WordPress blog posts and categories (Elementor + Polylang + Yoast) into Sanity.
 *
 *   npm run migrate:wordpress -- --dry-run --limit 5   # convert only, write preview JSON, no Sanity writes
 *   npm run migrate:wordpress -- --limit 5             # import the 5 newest posts
 *   npm run migrate:wordpress                          # import everything
 *
 * Posts and categories are both localized per document: each WordPress language gets its own
 * Sanity document carrying `language`, and Polylang's `translations` map is replayed as the
 * `translation.metadata` documents the document-internationalization plugin reads.
 *
 * Safe to rerun: posts and categories are matched on `wordpressId`, authors on slug, images on
 * their source URL, and translation links on the documents they reference.
 */
import {randomUUID} from 'node:crypto'
import {mkdirSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {htmlToBlocks, type TypedObject} from '@portabletext/block-tools'
import {JSDOM} from 'jsdom'
import {createSchema, type ArraySchemaType, type ObjectSchemaType} from 'sanity'
import {getCliClient} from 'sanity/cli'
import {schemaTypes} from '../schemaTypes'
import {defaultLanguage, supportedLanguages} from '../schemaTypes/fields/shared'

const WP_API = 'https://www.joestephenslaw.com/wp-json/wp/v2'
const WP_HOSTS = ['joestephenslaw.com', 'www.joestephenslaw.com']
const LANGUAGES = supportedLanguages.map((language) => language.id) as string[]

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const limitIndex = args.indexOf('--limit')
const LIMIT = limitIndex === -1 ? Infinity : Number(args[limitIndex + 1]) || Infinity
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

interface CleanResult {
  html: string
  keyTakeaways: {heading: string; items: string[]} | null
  ctas: RawCta[]
  dropped: string[]
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

function cleanElementorHtml(html: string): CleanResult {
  const doc = new JSDOM(`<body>${html}</body>`).window.document
  const dropped: string[] = []
  let keyTakeaways: CleanResult['keyTakeaways'] = null
  const ctas: RawCta[] = []

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

  return {html: doc.body.innerHTML, keyTakeaways, ctas, dropped}
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
  const {html: clean, keyTakeaways, ctas, dropped} = cleanElementorHtml(html)
  const {lead, sections: headingSections} = splitAtHeadings(await htmlToBody(clean, title))

  // The whole document, in render order.
  const sections = [
    ...(keyTakeaways?.items.length
      ? [{_key: key(), _type: 'keyTakeawaysSection', ...keyTakeaways}]
      : []),
    ...(lead.length ? [{_key: key(), _type: 'textSection', body: lead}] : []),
    ...headingSections,
    ...(await Promise.all(ctas.map((cta) => ctaSection(cta, title)))),
  ]

  return {sections, keyTakeaways, ctas, lead, headingSections, dropped}
}

const seoFields = (yoast: WpPost['yoast_head_json'] = {}) => ({
  _type: 'seo',
  ...(yoast.title ? {metaTitle: decode(yoast.title)} : {}),
  ...(yoast.description ? {metaDescription: yoast.description} : {}),
  noIndex: yoast.robots?.index === 'noindex',
})

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
async function migrateCategories(report: Array<Record<string, unknown>>) {
  console.log(`${DRY_RUN ? '[dry run] ' : ''}Fetching WordPress categories…`)
  const all = await fetchAllPaged<WpCategory>('categories')
  const categories = all.filter((category) => LANGUAGES.includes(category.lang ?? ''))
  const skipped = all.length - categories.length
  console.log(
    `Found ${categories.length} categories${skipped ? ` (${skipped} skipped: no language)` : ''}`,
  )

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
// Pages
// ---------------------------------------------------------------------------

/**
 * WordPress pages are hierarchical, so the leaf slug is not unique — several branches
 * have a `car-accident` child. The Sanity slug keeps the whole path. Polylang prefixes
 * Spanish URLs with `/es/`, which is dropped: the language lives on the document.
 */
function pagePath(page: WpPage): string {
  const path = new URL(page.link).pathname.replace(/^\/+|\/+$/g, '')
  const prefix = `${page.lang}/`
  return (path.startsWith(prefix) ? path.slice(prefix.length) : path) || page.slug
}

async function migratePages(report: Array<Record<string, unknown>>) {
  console.log(`${DRY_RUN ? '[dry run] ' : ''}Fetching WordPress pages…`)
  const all = await fetchAllPaged<WpPage>('pages', EMBED, LIMIT)
  const pages = all.filter((page) => LANGUAGES.includes(page.lang ?? ''))
  const skipped = all.length - pages.length
  console.log(`Found ${pages.length} pages${skipped ? ` (${skipped} skipped: no language)` : ''}`)

  const existing = await existingIdsByWpId('page')
  const idByWpId = new Map<number, string>()

  for (const [index, page] of pages.entries()) {
    const title = decode(page.title.rendered)
    const slug = pagePath(page)
    console.log(`[${index + 1}/${pages.length}] ${page.lang} ${slug}`)

    const {sections, keyTakeaways, ctas, lead, headingSections, dropped} = await convertContent(
      page.content.rendered,
      title,
    )
    const blocks = allBlocks(sections)

    const media = page._embedded?.['wp:featuredmedia']?.[0]
    const featuredAssetId = media?.source_url ? await uploadImage(media.source_url) : null
    const yoast = page.yoast_head_json ?? {}
    const excerpt = truncate(yoast.description || decode(page.excerpt.rendered), 300)

    const doc = {
      _type: 'page',
      language: page.lang,
      basic: {
        _type: 'basicFields',
        title,
        slug: {_type: 'slug', current: slug},
        ...(excerpt ? {excerpt} : {}),
        publishedAt: new Date(`${page.date_gmt}Z`).toISOString(),
        author: await authorRef(page._embedded?.author?.[0]),
        ...(featuredAssetId
          ? {featuredImage: imageField(featuredAssetId, media?.alt_text?.trim() || title)}
          : {}),
      },
      seo: seoFields(yoast),
      ...(sections.length ? {sections} : {}),
      wordpressId: page.id,
    }

    report.push({
      type: 'page',
      wordpressId: page.id,
      slug,
      language: page.lang,
      parent: page.parent || null,
      blocks: blocks.length,
      headingSections: headingSections.length,
      lede: lead.length,
      keyTakeaways: keyTakeaways?.items.length ?? 0,
      ctas: ctas.length,
      buttons: blocks.filter((block) => block._type === 'button').length,
      dropped,
    })

    if (DRY_RUN) {
      writePreview(`page-${page.lang}-${slug.replace(/\//g, '--')}.json`, doc)
      continue
    }

    const id = existing.get(page.id) ?? randomUUID()
    await withRetry(`save page ${slug}`, () => client.createOrReplace({...doc, _id: id}))
    idByWpId.set(page.id, id)
  }

  await linkTranslations(pages, 'page', idByWpId)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const report: Array<Record<string, unknown>> = []

  const categoryIdByWpId = await migrateCategories(report)

  console.log(`${DRY_RUN ? '[dry run] ' : ''}Fetching WordPress posts…`)
  const posts = (await fetchAllPaged<WpPost>('posts', EMBED, LIMIT)).filter((post) =>
    LANGUAGES.includes(post.lang ?? ''),
  )
  console.log(`Found ${posts.length} posts`)

  const existing = await existingIdsByWpId('post')

  const sanityIdByWpId = new Map<number, string>()

  for (const [index, post] of posts.entries()) {
    const title = decode(post.title.rendered)
    console.log(`[${index + 1}/${posts.length}] ${post.lang} ${post.slug}`)

    const {sections, keyTakeaways, ctas, lead, headingSections, dropped} = await convertContent(
      post.content.rendered,
      title,
    )
    const blocks = allBlocks(sections)

    const media = post._embedded?.['wp:featuredmedia']?.[0]
    const featuredAssetId = media?.source_url ? await uploadImage(media.source_url) : null
    const yoast = post.yoast_head_json ?? {}
    const excerpt = truncate(yoast.description || decode(post.excerpt.rendered), 300)

    // Posts carry several terms; Sanity's `category` holds one. Polylang keeps terms
    // per-language, so the first one that resolved is already the right language.
    const categoryId = (post.categories ?? [])
      .map((wpId) => categoryIdByWpId.get(wpId))
      .find((id): id is string => Boolean(id))

    const doc = {
      _type: 'post',
      language: post.lang,
      // title/slug/excerpt/publishedAt/author/featuredImage all live under `basic`.
      basic: {
        _type: 'basicFields',
        title,
        slug: {_type: 'slug', current: post.slug},
        ...(excerpt ? {excerpt} : {}),
        publishedAt: new Date(`${post.date_gmt}Z`).toISOString(),
        author: await authorRef(post._embedded?.author?.[0]),
        ...(featuredAssetId
          ? {featuredImage: imageField(featuredAssetId, media?.alt_text?.trim() || title)}
          : {}),
      },
      ...(categoryId ? {category: {_type: 'reference', _ref: categoryId}} : {}),
      seo: seoFields(yoast),
      ...(sections.length ? {sections} : {}),
      wordpressId: post.id,
    }

    report.push({
      type: 'post',
      wordpressId: post.id,
      slug: post.slug,
      language: post.lang,
      blocks: blocks.length,
      headingSections: headingSections.length,
      lede: lead.length,
      category: post.categories?.[0] ?? null,
      keyTakeaways: keyTakeaways?.items.length ?? 0,
      ctas: ctas.length,
      buttons: blocks.filter((block) => block._type === 'button').length,
      dropped,
    })

    if (DRY_RUN) {
      writePreview(`${post.lang}-${post.slug}.json`, doc)
      continue
    }

    // Pick the ID before saving so a retry after a dropped response overwrites instead of duplicating.
    const id = existing.get(post.id) ?? randomUUID()
    await withRetry(`save ${post.slug}`, () => client.createOrReplace({...doc, _id: id}))
    sanityIdByWpId.set(post.id, id)
  }

  await linkTranslations(posts, 'post', sanityIdByWpId)

  await migratePages(report)

  writePreview('_report.json', report)
  console.log(`Done. Report: ${join(OUTPUT_DIR, '_report.json')}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
