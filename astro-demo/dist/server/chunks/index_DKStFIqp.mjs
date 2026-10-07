import { c as renderSlot, d as renderTemplate, f as maybeRenderHead, h as createRenderInstruction, i as renderComponent } from "./server_Dl94ER1L.mjs";
import { t as createComponent } from "./compiler_DtohOOJ0.mjs";
import { t as $$Main } from "./main_CRO2gh2O.mjs";
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region node_modules/astro/dist/runtime/server/render/script.js
async function renderScript(result, id) {
	const inlined = result.inlinedScripts.get(id);
	let content = "";
	if (inlined != null) {
		if (inlined) content = `<script type="module">${inlined}<\/script>`;
	} else {
		const resolved = await result.resolve(id);
		content = `<script type="module" src="${result.userAssetsBase ? (result.base === "/" ? "" : result.base) + result.userAssetsBase : ""}${resolved}"><\/script>`;
	}
	return createRenderInstruction({
		type: "script",
		id,
		content
	});
}
//#endregion
//#region src/components/Button.astro
var $$Button = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${maybeRenderHead($$result)}<button class="appearance-none py-2 px-4 bg-purple-500 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75">${renderSlot($$result, $$slots["default"])}</button>${renderScript($$result, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/components/Button.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/components/Button.astro", void 0);
//#endregion
//#region src/pages/index.astro
var pages_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => ""
});
var $$Index = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "Main", $$Main, {
		"title": "Astro + Sanity Demo",
		"description": "A simple demo showing how Astro works with Sanity as a headless CMS."
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="min-h-screen flex items-center justify-center px-6"><div class="max-w-3xl text-center"><p class="text-sm font-semibold uppercase tracking-widest text-purple-600 mb-4">Demo Project</p><h1 class="text-5xl md:text-6xl font-bold tracking-tight mb-6">Astro + Sanity</h1><p class="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8">A simple demo showing how Astro can work with Sanity as a headless CMS to create fast, flexible websites.</p><!-- Main Buttons --><div class="flex flex-col sm:flex-row items-center justify-center gap-3">${renderComponent($$result, "Button", $$Button, {}, { "default": ($$result) => renderTemplate`Get Started` })}<a href="/posts" class="px-5 py-2 rounded-lg border border-gray-300 font-semibold hover:bg-gray-100 transition">View Posts</a></div><!-- Live Page Section --><div class="mt-10 p-6 rounded-xl border border-gray-200"><p class="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-2">Sanity Page</p><h2 class="text-2xl font-bold mb-2">View Live Page</h2><p class="text-gray-600 mb-5">View a page created and managed through Sanity.</p><a href="/lorem-ipsum-page" class="inline-block px-5 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-800 transition">View Live Page</a></div><div class="grid md:grid-cols-2 gap-4 mt-12 text-left"><div class="p-6 rounded-xl border border-gray-200"><h2 class="text-xl font-semibold mb-2">Astro</h2><p class="text-gray-600">A modern web framework focused on fast, content-driven websites with minimal JavaScript.</p></div><div class="p-6 rounded-xl border border-gray-200"><h2 class="text-xl font-semibold mb-2">Sanity</h2><p class="text-gray-600">A flexible headless CMS for creating, managing, and delivering structured content.</p></div></div></div></main>` })}`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/pages/index.astro", void 0);
var $$file = "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/pages/index.astro";
//#endregion
//#region \0virtual:astro:page:src/pages/index@_@astro
var page = () => pages_exports;
//#endregion
export { page, __exportAll as t };
