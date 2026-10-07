import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { createClient } from "@sanity/client";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import sanity from "@sanity/astro";

// Docs for redirects
// https://www.sanity.io/docs/developer-guides/managing-redirects-with-sanity

// Initialize Sanity client
const client = createClient({
  projectId: "igodg8qe",
  dataset: "production",
  useCdn: false, // Ensure no accidental 'stale' data
  apiVersion: "2026-10-02", // use current date (YYYY-MM-DD) to target the latest API version
});

// Fetch our redirects from Sanity via GROQ
const redirectData = await client.fetch(
  `*[_type == "redirect"]{
	  "from": from.current,
	  "to": to.current
	}`,
);

// Create empty object to add our redirects to
const redirects = {};

// Loop through redirects from Sanity and make them key/value pairs as Astro expects
redirectData.map((redirect) => (redirects[redirect.from] = redirect.to));

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  site: "https://sanity-astro-kappa.vercel.app/",
  output: "server",
  adapter: vercel(),
  integrations: [
    sanity({
      projectId: "igodg8qe",
      dataset: "production",
      useCdn: false, // for static builds
    }),
    sitemap(),
  ],
  redirects, // pass the object we made above
});
