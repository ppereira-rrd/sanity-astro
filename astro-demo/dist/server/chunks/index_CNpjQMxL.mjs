import { d as renderTemplate, f as maybeRenderHead, i as renderComponent, m as addAttribute } from "./server_Dl94ER1L.mjs";
import { t as createComponent } from "./compiler_DtohOOJ0.mjs";
import { n as sanityClient, t as $$Main } from "./main_CRO2gh2O.mjs";
import { t as __exportAll } from "./index_DKStFIqp.mjs";
//#region src/pages/posts/index.astro
var posts_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => $$url
});
var $$Index = createComponent(async ($$result, $$props, $$slots) => {
	const posts = await sanityClient.fetch(`*[
  _type == "post"
  && defined(basic.slug.current)
]|order(basic.publishedAt desc)[0...12]{
  _id,
  "title": basic.title,
  "slug": basic.slug,
  "excerpt": basic.excerpt,
  "publishedAt": basic.publishedAt,
  "featuredImage": basic.featuredImage
}`);
	return renderTemplate`${renderComponent($$result, "Main", $$Main, {
		"title": "Posts | Astro + Sanity",
		"description": "A simple demo showing how Astro works with Sanity as a headless CMS."
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<body><main class="min-h-screen flex items-center justify-center px-6 py-16"><div class="max-w-3xl w-full"><div class="text-center mb-12"><p class="text-sm font-semibold uppercase tracking-widest text-purple-600 mb-4">Sanity CMS</p><h1 class="text-5xl md:text-6xl font-bold tracking-tight mb-6">Posts</h1><p class="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">Content managed in Sanity and rendered with Astro.</p></div>${posts.length > 0 ? renderTemplate`<div class="grid gap-4">${posts.map((post) => renderTemplate`<a${addAttribute(`/posts/${post.slug.current}`, "href")} class="block p-6 rounded-xl border border-gray-200 hover:bg-gray-50 hover:shadow-md transition"><div class="flex items-center justify-between gap-4"><div><h2 class="text-xl font-semibold mb-2">${post.title}</h2><p class="text-sm text-gray-500">${new Date(post.publishedAt).toLocaleDateString()}</p></div><span class="text-purple-600 text-xl">→</span></div></a>`)}</div>` : renderTemplate`<div class="p-8 rounded-xl border border-gray-200 text-center"><h2 class="text-xl font-semibold mb-2">No posts yet</h2><p class="text-gray-600">Create a post in Sanity and it will appear here.</p></div>`}<div class="text-center mt-10"><a href="/" class="text-purple-600 underline hover:text-purple-800">← Back to home</a></div></div></main></body>` })}`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/pages/posts/index.astro", void 0);
var $$file = "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/pages/posts/index.astro";
var $$url = "/posts";
//#endregion
//#region \0virtual:astro:page:src/pages/posts/index@_@astro
var page = () => posts_exports;
//#endregion
export { page };
