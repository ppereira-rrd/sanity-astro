import type { SanityDocument } from "@sanity/client";
import { sanityClient } from "sanity:client";

export type Language = "en" | "es";

/** `/es` and everything under it is Spanish; anything else is English. */
export const languageFromPath = (pathname: string): Language =>
  /^\/es(\/|$)/.test(pathname) ? "es" : "en";

/**
 * The sitewide settings for one language. The studio keeps one `siteSettings` document per
 * language under a fixed ID, so a Spanish page with no Spanish settings yet falls back to
 * the English ones instead of rendering an empty header.
 */
export async function getSiteSettings(
  language: Language,
): Promise<SanityDocument | null> {
  const settings = await sanityClient.fetch<SanityDocument[]>(
    `*[_id in [$id, "siteSettings-en"]]`,
    { id: `siteSettings-${language}` },
  );

  return (
    settings.find((doc) => doc._id === `siteSettings-${language}`) ??
    settings[0] ??
    null
  );
}
