/**
 * Anchor ids for a document's `headingSection`s. Shared by TableOfContents and
 * HeadingSection so both sides agree on every anchor — including when a migrated
 * article repeats a heading and the second one needs an id of its own.
 */

export type HeadingLevel = 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

export interface TocItem {
  /** The `_key` of the `headingSection` this came from, so a route can look the id back up. */
  key: string
  id: string
  text: string
  level: HeadingLevel
}

/** Lowercase, accents stripped, everything else collapsed to dashes — `¿Qué sigue?` → `que-sigue`. */
export function slugifyHeading(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Every heading in the document, in order, with a unique anchor id each. */
export function tableOfContents(sections: unknown): TocItem[] {
  if (!Array.isArray(sections)) return []

  const used = new Map<string, number>()
  const items: TocItem[] = []

  for (const section of sections) {
    if (section?._type !== 'headingSection') continue

    const text = typeof section.heading === 'string' ? section.heading.trim() : ''
    if (!text) continue

    const base = slugifyHeading(text) || 'section'
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)

    items.push({
      key: section._key,
      id: seen ? `${base}-${seen + 1}` : base,
      text,
      level: section.headingLevel ?? 'h2',
    })
  }

  return items
}
