import { d as renderTemplate, f as maybeRenderHead, i as renderComponent } from "./server_Dl94ER1L.mjs";
import { t as createComponent } from "./compiler_DtohOOJ0.mjs";
import { t as $$Main } from "./main_CRO2gh2O.mjs";
import { t as __exportAll } from "./index_DKStFIqp.mjs";
//#region src/pages/404.astro
var _404_exports = /* @__PURE__ */ __exportAll({
	default: () => $$404,
	file: () => $$file,
	url: () => $$url
});
var $$404 = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "Main", $$Main, {
		"title": "404 | Page Not Found",
		"description": "The page you're looking for could not be found."
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="min-h-screen flex items-center justify-center px-6"><div class="max-w-2xl text-center"><p class="text-sm font-semibold uppercase tracking-widest text-purple-600 mb-4">Error 404</p><h1 class="text-5xl md:text-6xl font-bold tracking-tight mb-6">Page Not Found</h1><p class="text-lg md:text-xl text-gray-600 max-w-xl mx-auto mb-8">Sorry, the page you're looking for doesn't exist or may have been moved.</p><div class="flex flex-col sm:flex-row items-center justify-center gap-3"><a href="/" class="px-5 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-800 transition">Back to Home</a><a href="/posts" class="px-5 py-2 rounded-lg border border-gray-300 font-semibold hover:bg-gray-100 transition">View Posts</a></div></div></main>` })}`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/pages/404.astro", void 0);
var $$file = "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/pages/404.astro";
var $$url = "/404";
//#endregion
//#region \0virtual:astro:page:src/pages/404@_@astro
var page = () => _404_exports;
//#endregion
export { page };
