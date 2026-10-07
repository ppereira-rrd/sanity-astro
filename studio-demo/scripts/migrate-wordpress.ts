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
import {supportedLanguages} from '../schemaTypes/fields/shared'

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
 * Compile the studio's real schema and reuse the `post.body` array type, so the HTML
 * deserializer only ever emits blocks, images and videos that `body` actually allows.
 * Keeping it derived means a schema change can't silently drift from the migration.
 */
const schema = createSchema({name: 'migration', types: schemaTypes})
const postSchema = schema.get('post') as ObjectSchemaType | undefined
const bodyType = postSchema?.fields.find((field) => field.name === 'body')?.type as
  ArraySchemaType | undefined

if (!bodyType) {
  throw new Error('Could not resolve the `body` field on the `post` schema type')
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

async function fetchAllPosts(): Promise<WpPost[]> {
  const posts: WpPost[] = []
  for (let page = 1; ; page++) {
    const response = await withRetry(`posts page ${page}`, () =>
      fetch(`${WP_API}/posts?per_page=100&page=${page}&_embed=author,wp:featuredmedia`),
    )
    if (!response.ok) throw new Error(`WordPress API ${response.status} on page ${page}`)
    posts.push(...((await response.json()) as WpPost[]))
    const totalPages = Number(response.headers.get('x-wp-totalpages') ?? 1)
    if (page >= totalPages || posts.length >= LIMIT) break
  }
  return posts.slice(0, LIMIT)
}

async function fetchAllCategories(): Promise<WpCategory[]> {
  const categories: WpCategory[] = []
  for (let page = 1; ; page++) {
    const response = await withRetry(`categories page ${page}`, () =>
      fetch(`${WP_API}/categories?per_page=100&page=${page}`),
    )
    if (!response.ok) throw new Error(`WordPress API ${response.status} on categories page ${page}`)
    categories.push(...((await response.json()) as WpCategory[]))
    const totalPages = Number(response.headers.get('x-wp-totalpages') ?? 1)
    if (page >= totalPages) break
  }
  return categories
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
  'button',
  'icon',
  'divider',
  'google_maps',
  'html',
  'nested-carousel',
  'uael-video-gallery',
  'template',
]

interface CleanResult {
  html: string
  keyTakeaways: {heading: string; items: string[]} | null
  dropped: string[]
}

function renameElement(el: Element, tagName: string) {
  const replacement = el.ownerDocument.createElement(tagName)
  replacement.innerHTML = el.innerHTML
  el.replaceWith(replacement)
}

function cleanElementorHtml(html: string): CleanResult {
  const doc = new JSDOM(`<body>${html}</body>`).window.document
  const dropped: string[] = []
  let keyTakeaways: CleanResult['keyTakeaways'] = null

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

  // Shared Elementor library templates left at this point are CTAs / promo blocks.
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

  // Links back to the old site become relative so they resolve on the new site.
  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href')!.trim()
    if (/^tel:/i.test(href)) {
      a.setAttribute('href', `tel:${href.slice(4).replace(/[^\d+]/g, '')}`)
      return
    }
    try {
      const url = new URL(href)
      if (WP_HOSTS.includes(url.hostname)) {
        a.setAttribute('href', `${url.pathname.replace(/\/$/, '') || '/'}${url.search}${url.hash}`)
      }
    } catch {
      // Relative, mailto: — leave as is.
    }
  })

  return {html: doc.body.innerHTML, keyTakeaways, dropped}
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
  const all = await fetchAllCategories()
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
    const doc = {
      _type: 'category',
      language: category.lang,
      title: decode(category.name),
      slug: {_type: 'slug', current: category.slug},
      ...(category.description ? {description: decode(category.description)} : {}),
      wordpressId: category.id,
    }

    report.push({
      type: 'category',
      wordpressId: category.id,
      slug: category.slug,
      language: category.lang,
    })

    if (DRY_RUN) {
      // Placeholder IDs keep the post previews' category references readable.
      idByWpId.set(category.id, `category-dry-run-${category.lang}-${category.slug}`)
      writePreview(`category-${category.lang}-${category.slug}.json`, doc)
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
// Main
// ---------------------------------------------------------------------------

async function main() {
  const report: Array<Record<string, unknown>> = []

  const categoryIdByWpId = await migrateCategories(report)

  console.log(`${DRY_RUN ? '[dry run] ' : ''}Fetching WordPress posts…`)
  const posts = (await fetchAllPosts()).filter((post) => LANGUAGES.includes(post.lang ?? ''))
  console.log(`Found ${posts.length} posts`)

  const existing = DRY_RUN
    ? new Map<number, string>()
    : new Map(
        (
          await client.fetch<Array<{_id: string; wordpressId: number}>>(
            `*[_type == "post" && defined(wordpressId) && !(_id in path("drafts.**"))]{_id, wordpressId}`,
          )
        ).map((doc) => [doc.wordpressId, doc._id]),
      )

  const sanityIdByWpId = new Map<number, string>()

  for (const [index, post] of posts.entries()) {
    const title = decode(post.title.rendered)
    console.log(`[${index + 1}/${posts.length}] ${post.lang} ${post.slug}`)

    const {html, keyTakeaways, dropped} = cleanElementorHtml(post.content.rendered)
    const body = await htmlToBody(html, title)

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
      seo: {
        _type: 'seo',
        ...(yoast.title ? {metaTitle: decode(yoast.title)} : {}),
        ...(yoast.description ? {metaDescription: yoast.description} : {}),
        noIndex: yoast.robots?.index === 'noindex',
      },
      body,
      // Key takeaways are a section, rendered after the body.
      ...(keyTakeaways?.items.length
        ? {sections: [{_key: key(), _type: 'keyTakeawaysSection', ...keyTakeaways}]}
        : {}),
      wordpressId: post.id,
    }

    report.push({
      type: 'post',
      wordpressId: post.id,
      slug: post.slug,
      language: post.lang,
      blocks: body.length,
      category: post.categories?.[0] ?? null,
      keyTakeaways: keyTakeaways?.items.length ?? 0,
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

  writePreview('_report.json', report)
  console.log(`Done. Report: ${join(OUTPUT_DIR, '_report.json')}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
