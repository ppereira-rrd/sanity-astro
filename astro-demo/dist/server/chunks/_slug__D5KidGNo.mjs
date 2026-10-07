import { C as createAstro, a as Fragment, d as renderTemplate, f as maybeRenderHead, i as renderComponent, m as addAttribute } from "./server_Dl94ER1L.mjs";
import { t as createComponent } from "./compiler_DtohOOJ0.mjs";
import { n as sanityClient, t as $$Main } from "./main_CRO2gh2O.mjs";
import { t as $$PortableText } from "./lib_2qgMXx95.mjs";
import { t as __exportAll } from "./index_DKStFIqp.mjs";
import { createImageUrlBuilder } from "@sanity/image-url";
//#region src/components/BodyImage.astro
createAstro("https://sanity-astro-kappa.vercel.app/");
var $$BodyImage = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$BodyImage;
	const { node } = Astro.props;
	const image = node;
	const { projectId, dataset } = sanityClient.config();
	const src = image.asset?._ref && projectId && dataset ? createImageUrlBuilder({
		projectId,
		dataset
	}).image(image).width(900).fit("max").auto("format").url() : null;
	return renderTemplate`${src && renderTemplate`${maybeRenderHead($$result)}<figure class="my-8"><img${addAttribute(src, "src")}${addAttribute(image.alt || "", "alt")} class="w-full rounded-xl" loading="lazy" decoding="async">${image.caption && renderTemplate`<figcaption class="mt-3 text-center text-sm text-gray-500">${image.caption}</figcaption>`}</figure>`}`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/components/BodyImage.astro", void 0);
//#endregion
//#region src/components/BodyVideo.astro
createAstro("https://sanity-astro-kappa.vercel.app/");
var $$BodyVideo = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$BodyVideo;
	const { node } = Astro.props;
	const { url, title } = node;
	function toEmbedUrl(input) {
		try {
			const { hostname, pathname, searchParams } = new URL(input);
			if (hostname.endsWith("youtube.com")) {
				const id = searchParams.get("v") ?? pathname.replace("/embed/", "");
				return id ? `https://www.youtube.com/embed/${id}` : null;
			}
			if (hostname.endsWith("youtu.be")) return `https://www.youtube.com/embed/${pathname.slice(1)}`;
			if (hostname.endsWith("vimeo.com")) {
				const id = pathname.split("/").filter(Boolean).pop();
				return id ? `https://player.vimeo.com/video/${id}` : null;
			}
			return null;
		} catch {
			return null;
		}
	}
	const embedUrl = url ? toEmbedUrl(url) : null;
	return renderTemplate`${embedUrl ? renderTemplate`${maybeRenderHead($$result)}<div class="my-8 aspect-video overflow-hidden rounded-xl"><iframe${addAttribute(embedUrl, "src")}${addAttribute(title || "Video", "title")} class="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : url && renderTemplate`<video${addAttribute(url, "src")}${addAttribute(title, "title")} class="my-8 w-full rounded-xl" controls preload="metadata"></video>`}`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/components/BodyVideo.astro", void 0);
//#endregion
//#region src/components/KeyTakeawaysSection.astro
createAstro("https://sanity-astro-kappa.vercel.app/");
var $$KeyTakeawaysSection = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$KeyTakeawaysSection;
	const { heading, items } = Astro.props;
	return renderTemplate`${items && items.length > 0 && renderTemplate`${maybeRenderHead($$result)}<section class="my-10 rounded-xl border border-purple-200 bg-purple-50 p-6 md:p-8"><h2 class="mb-4 text-sm font-semibold uppercase tracking-widest text-purple-700">${heading || "Key takeaways"}</h2><ul class="space-y-3">${items.map((item) => renderTemplate`<li class="flex gap-3 text-gray-700"><span aria-hidden="true" class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-600"></span><span>${item}</span></li>`)}</ul></section>`}`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/components/KeyTakeawaysSection.astro", void 0);
//#endregion
//#region src/pages/posts/[slug].astro
var _slug__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Slug,
	file: () => $$file,
	getStaticPaths: () => getStaticPaths,
	url: () => $$url
});
createAstro("https://sanity-astro-kappa.vercel.app/");
async function getStaticPaths() {
	return await sanityClient.fetch(`*[
  _type == "post" &&
  defined(basic.slug.current)
]{
  "params": {
    "slug": basic.slug.current
  }
}`);
}
var $$Slug = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Slug;
	const post = await sanityClient.fetch(`*[
  _type == "post" &&
  basic.slug.current == $slug
][0]{
  ...,
  basic {
    ...,
    author->{name, bio}
  }
}`, Astro.params);
	const { projectId, dataset } = sanityClient.config();
	const urlFor = (source) => projectId && dataset ? createImageUrlBuilder({
		projectId,
		dataset
	}).image(source) : null;
	const postImageUrl = post.basic?.featuredImage ? urlFor(post.basic.featuredImage)?.width(900).height(500).url() : null;
	const bodyComponents = { type: {
		image: $$BodyImage,
		video: $$BodyVideo
	} };
	return renderTemplate`${renderComponent($$result, "Main", $$Main, {
		"title": `${post.basic?.title || "Post"} | Astro + Sanity`,
		"description": post.basic?.excerpt || ""
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="min-h-screen flex items-center justify-center px-6 py-16"><article class="max-w-3xl w-full"><a href="/posts" class="inline-block text-purple-600 underline hover:text-purple-800 mb-10">← Back to posts</a><div class="text-center mb-10"><p class="text-sm font-semibold uppercase tracking-widest text-purple-600 mb-4">Sanity CMS</p><h1 class="text-4xl md:text-5xl font-bold tracking-tight mb-4">${post.basic?.title}</h1>${post.basic?.publishedAt && renderTemplate`<p class="text-gray-500">Published ${new Date(post.basic.publishedAt).toLocaleDateString()}${post.basic?.author?.name && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate` · By ${post.basic.author.name}` })}`}</p>`}</div>${postImageUrl && renderTemplate`<img${addAttribute(postImageUrl, "src")}${addAttribute(post.basic?.title || "", "alt")} class="w-full aspect-video object-cover rounded-xl mb-10" width="900" height="500">`}${post.basic?.excerpt && renderTemplate`<p class="text-lg text-gray-600 mb-8">${post.basic.excerpt}</p>`}<div class="p-6 md:p-8 rounded-xl border border-gray-200"><div class="prose max-w-none">${Array.isArray(post.body) && renderTemplate`${renderComponent($$result, "PortableText", $$PortableText, {
		"value": post.body,
		"components": bodyComponents
	})}`}</div></div>${Array.isArray(post.sections) && post.sections.map((section) => {
		switch (section._type) {
			case "keyTakeawaysSection": return renderTemplate`${renderComponent($$result, "KeyTakeawaysSection", $$KeyTakeawaysSection, { ...section })}`;
			default: return null;
		}
	})}${post.basic?.author?.bio && renderTemplate`<div class="mt-10 rounded-xl border border-gray-200 p-6"><p class="mb-2 text-sm font-semibold uppercase tracking-widest text-purple-600">About the author</p><p class="font-semibold">${post.basic.author.name}</p><p class="mt-1 text-gray-600">${post.basic.author.bio}</p></div>`}<div class="text-center mt-10"><a href="/posts" class="text-purple-600 underline hover:text-purple-800">← View all posts</a></div></article></main>` })}`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/pages/posts/[slug].astro", void 0);
var $$file = "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/pages/posts/[slug].astro";
var $$url = "/posts/[slug]";
//#endregion
//#region \0virtual:astro:page:src/pages/posts/[slug]@_@astro
var page = () => _slug__exports;
//#endregion
export { page };
