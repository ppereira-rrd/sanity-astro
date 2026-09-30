import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import sanity from "@sanity/astro";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    sanity({
      projectId: "igodg8qe",
      dataset: "production",
      useCdn: false, // for static builds
    }),
  ],
});