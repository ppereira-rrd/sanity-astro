import { C as createAstro, c as renderSlot, d as renderTemplate, f as maybeRenderHead, i as renderComponent, m as addAttribute, p as renderHead } from "./server_Dl94ER1L.mjs";
import { t as createComponent } from "./compiler_DtohOOJ0.mjs";
import { createClient } from "@sanity/client";
//#region \0sanity:client
var sanityClient = createClient({
	"apiVersion": "v2023-08-24",
	"projectId": "igodg8qe",
	"dataset": "production",
	"useCdn": false
});
//#endregion
//#region astro:scripts/page-ssr.js
globalThis.sanityClient = sanityClient;
//#endregion
//#region src/components/Header.astro
var $$Header = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${maybeRenderHead($$result)}<header class="border-b border-gray-200"><div class="max-w-5xl mx-auto px-6 py-5"><div class="flex items-center justify-between"><a href="/" class="text-xl font-bold tracking-tight hover:text-purple-600 transition">Astro + Sanity</a><nav class="flex items-center gap-6"><a href="/" class="text-gray-600 hover:text-purple-600 transition">Home</a><a href="/posts" class="text-gray-600 hover:text-purple-600 transition">Posts</a></nav></div></div></header>`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/components/Header.astro", void 0);
//#endregion
//#region src/components/Footer.astro
var $$Footer = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${maybeRenderHead($$result)}<footer class="border-t border-gray-200 mt-16"><div class="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4"><p class="text-sm text-gray-500">Astro + Sanity Demo</p><div class="flex items-center gap-5 text-sm"><a href="/" class="text-gray-500 hover:text-purple-600 transition">Home</a><a href="/posts" class="text-gray-500 hover:text-purple-600 transition">Posts</a></div></div></footer>`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/components/Footer.astro", void 0);
//#endregion
//#region src/layouts/main.astro
createAstro("https://sanity-astro-kappa.vercel.app/");
var $$Main = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Main;
	const { title = "Astro + Sanity Demo", description = "A simple demo project using Astro and Sanity." } = Astro.props;
	return renderTemplate`<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="icon" href="/favicon.ico"><title>${title}</title><meta name="description"${addAttribute(description, "content")}>${renderHead($$result)}</head><body>${renderComponent($$result, "Header", $$Header, {})}<main>${renderSlot($$result, $$slots["default"])}</main>${renderComponent($$result, "Footer", $$Footer, {})}</body></html>`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/layouts/main.astro", void 0);
//#endregion
export { sanityClient as n, $$Main as t };
