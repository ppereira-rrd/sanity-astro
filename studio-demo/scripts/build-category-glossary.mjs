/**
 * Builds scripts/data/category-translations.json: English category → Spanish category, taken
 * from a WordPress site where Polylang has already linked them (default: joestephenslaw.com).
 * migrate-wordpress.ts reads it when pairing Spanish and English categories on a site that
 * has no Polylang links of its own.
 *
 *   node scripts/build-category-glossary.mjs [https://other-linked-site.com]
 *
 * Rerunning merges: pairs already in the file stay, new ones are added, so glossaries from
 * several clients accumulate and entries can be hand-edited.
 */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const site = (process.argv[2] ?? 'https://www.joestephenslaw.com').replace(/\/+$/, '')
const file = join(dirname(fileURLToPath(import.meta.url)), 'data', 'category-translations.json')

const decode = (text) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&#039;/g, "'")
    .replace(/&#8211;/g, '–')
    .trim()

/** Words left alone: Spanish connectors and words that end in "s" without being plural. */
const KEEP = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'and', 'news', 'business', 'insurance'])

const singularEnglish = (word) =>
  KEEP.has(word.toLowerCase()) || word.length < 4
    ? word
    : word.replace(/ies$/i, 'y').replace(/(ss|us)$/i, '$1').replace(/(s|x|ch|sh)es$/i, '$1').replace(/([^s])s$/i, '$1')

/** Lesiones → Lesión, Accidentes → Accidente, Generales → General, Casos → Caso. */
const singularSpanish = (word) =>
  KEEP.has(word.toLowerCase()) || word.length < 4
    ? word
    : word
        .replace(/iones$/i, (m) => (m[0] === 'I' ? 'IÓN' : 'ión'))
        .replace(/([lrnd])es$/i, '$1')
        .replace(/([^s])s$/i, '$1')

const singularize = (title, fn) => title.split(' ').map(fn).join(' ')

/** Every pair also as singular — "Car Accident" ↔ "Accidente de Auto" — because categories get named both ways. */
const withSingulars = (pair) => {
  const singular = {en: singularize(pair.en, singularEnglish), es: singularize(pair.es, singularSpanish)}
  return singular.en === pair.en && singular.es === pair.es ? [pair] : [pair, {...singular, form: 'singular'}]
}

const terms = []
for (let page = 1; ; page++) {
  const res = await fetch(`${site}/wp-json/wp/v2/categories?per_page=100&page=${page}`)
  if (res.status === 400) break
  if (!res.ok) throw new Error(`${site}: ${res.status}`)
  const batch = await res.json()
  terms.push(...batch)
  if (batch.length < 100) break
}

const byId = new Map(terms.map((term) => [term.id, term]))
const pairs = terms
  .filter((term) => term.lang === 'en' && byId.has(term.translations?.es))
  .map((term) => ({en: decode(term.name), es: decode(byId.get(term.translations.es).name)}))
  .flatMap(withSingulars)

const existing = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : []
const merged = [...existing]
for (const pair of pairs) {
  if (!merged.some((entry) => entry.en.toLowerCase() === pair.en.toLowerCase() && entry.es.toLowerCase() === pair.es.toLowerCase())) {
    merged.push({...pair, source: site})
  }
}
merged.sort((a, b) => a.en.localeCompare(b.en))

mkdirSync(dirname(file), {recursive: true})
writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`)
console.log(`${merged.length} pairs (${merged.length - existing.length} new) → ${file}`)
