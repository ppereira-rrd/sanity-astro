import { C as createAstro, a as Fragment, d as renderTemplate, f as maybeRenderHead, i as renderComponent, m as addAttribute } from "./server_Dl94ER1L.mjs";
import { t as createComponent } from "./compiler_DtohOOJ0.mjs";
import { n as sanityClient, t as $$Main } from "./main_CRO2gh2O.mjs";
import { t as $$PortableText } from "./lib_2qgMXx95.mjs";
import { t as __exportAll } from "./index_DKStFIqp.mjs";
import { createImageUrlBuilder } from "@sanity/image-url";
//#region src/components/HeroSection.astro
createAstro("https://sanity-astro-kappa.vercel.app/");
var $$HeroSection = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$HeroSection;
	const { heading, text, image, buttonText, buttonUrl } = Astro.props;
	const { projectId, dataset } = sanityClient.config();
	const urlFor = (source) => projectId && dataset ? createImageUrlBuilder({
		projectId,
		dataset
	}).image(source) : null;
	const imageUrl = image ? urlFor(image)?.width(1200).height(700).url() : null;
	return renderTemplate`${maybeRenderHead($$result)}<section class="py-16 md:py-24 px-6"><div class="max-w-6xl mx-auto"><div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"><div>${heading && renderTemplate`<h2 class="text-3xl md:text-5xl font-bold tracking-tight mb-6">${heading}</h2>`}${Array.isArray(text) && renderTemplate`<div class="prose max-w-none mb-8">${renderComponent($$result, "PortableText", $$PortableText, { "value": text })}</div>`}${buttonText && buttonUrl && renderTemplate`<a${addAttribute(buttonUrl, "href")} class="inline-block px-6 py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-800 transition">${buttonText}</a>`}</div>${imageUrl && renderTemplate`<div><img${addAttribute(imageUrl, "src")}${addAttribute(heading || "", "alt")} width="1200" height="700" class="w-full rounded-xl object-cover"></div>`}</div></div></section>`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/components/HeroSection.astro", void 0);
//#endregion
//#region src/components/HeadingSection.astro
createAstro("https://sanity-astro-kappa.vercel.app/");
var $$HeadingSection = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$HeadingSection;
	const { heading, headingLevel = "h2", body } = Astro.props;
	const headingTag = headingLevel;
	return renderTemplate`${maybeRenderHead($$result)}<section class="py-12 px-6"><div class="max-w-6xl mx-auto">${heading && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`${headingTag === "h2" && renderTemplate`<h2 class="text-3xl md:text-4xl font-bold tracking-tight mb-6">${heading}</h2>`}${headingTag === "h3" && renderTemplate`<h3 class="text-2xl md:text-3xl font-bold tracking-tight mb-6">${heading}</h3>`}${headingTag === "h4" && renderTemplate`<h4 class="text-xl md:text-2xl font-bold tracking-tight mb-5">${heading}</h4>`}${headingTag === "h5" && renderTemplate`<h5 class="text-lg md:text-xl font-bold tracking-tight mb-4">${heading}</h5>`}${headingTag === "h6" && renderTemplate`<h6 class="text-base md:text-lg font-bold tracking-tight mb-4">${heading}</h6>`}` })}`}${Array.isArray(body) && renderTemplate`<div class="prose max-w-3xl">${renderComponent($$result, "PortableText", $$PortableText, { "value": body })}</div>`}</div></section>`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/components/HeadingSection.astro", void 0);
//#endregion
//#region src/components/CtaSection.astro
createAstro("https://sanity-astro-kappa.vercel.app/");
var $$CtaSection = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$CtaSection;
	const { heading, text, buttonText, buttonUrl } = Astro.props;
	return renderTemplate`${maybeRenderHead($$result)}<section class="py-16 md:py-24 px-6"><div class="max-w-6xl mx-auto"><div class="rounded-xl border border-gray-200 p-8 md:p-12 text-center">${heading && renderTemplate`<h2 class="text-3xl md:text-4xl font-bold tracking-tight mb-5">${heading}</h2>`}${Array.isArray(text) && renderTemplate`<div class="prose max-w-2xl mx-auto mb-8">${renderComponent($$result, "PortableText", $$PortableText, { "value": text })}</div>`}${buttonText && buttonUrl && renderTemplate`<a${addAttribute(buttonUrl, "href")} class="inline-block px-6 py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-800 transition">${buttonText}</a>`}</div></div></section>`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/components/CtaSection.astro", void 0);
//#endregion
//#region src/components/FaqSection.astro
createAstro("https://sanity-astro-kappa.vercel.app/");
var $$FaqSection = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$FaqSection;
	const { heading, faqs } = Astro.props;
	return renderTemplate`${maybeRenderHead($$result)}<section class="py-16 md:py-24 px-6"><div class="max-w-4xl mx-auto">${heading && renderTemplate`<h2 class="text-3xl md:text-4xl font-bold tracking-tight mb-10">${heading}</h2>`}${faqs && faqs.length > 0 && renderTemplate`<div class="space-y-4">${faqs.map((faq) => renderTemplate`<details class="border border-gray-200 rounded-lg p-5 group">${faq.question && renderTemplate`<summary class="font-semibold text-lg cursor-pointer">${faq.question}</summary>`}${Array.isArray(faq.answer) && renderTemplate`<div class="prose max-w-none mt-4">${renderComponent($$result, "PortableText", $$PortableText, { "value": faq.answer })}</div>`}</details>`)}</div>`}</div></section>`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/components/FaqSection.astro", void 0);
//#endregion
//#region src/components/FeatureGridSection.astro
createAstro("https://sanity-astro-kappa.vercel.app/");
var $$FeatureGridSection = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$FeatureGridSection;
	const { heading, features } = Astro.props;
	return renderTemplate`${maybeRenderHead($$result)}<section class="py-16 md:py-24 px-6"><div class="max-w-6xl mx-auto">${heading && renderTemplate`<h2 class="text-3xl md:text-4xl font-bold tracking-tight mb-10">${heading}</h2>`}${features && features.length > 0 && renderTemplate`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${features.map((feature) => renderTemplate`<div class="border border-gray-200 rounded-xl p-6">${feature.title && renderTemplate`<h3 class="text-xl font-semibold mb-4">${feature.title}</h3>`}${Array.isArray(feature.text) && renderTemplate`<div class="prose max-w-none">${renderComponent($$result, "PortableText", $$PortableText, { "value": feature.text })}</div>`}</div>`)}</div>`}</div></section>`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/components/FeatureGridSection.astro", void 0);
//#endregion
//#region src/components/TestimonialSection.astro
createAstro("https://sanity-astro-kappa.vercel.app/");
var $$TestimonialSection = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$TestimonialSection;
	const { heading, testimonials } = Astro.props;
	return renderTemplate`${maybeRenderHead($$result)}<section class="py-16 md:py-24 px-6"><div class="max-w-6xl mx-auto">${heading && renderTemplate`<h2 class="text-3xl md:text-4xl font-bold tracking-tight mb-10">${heading}</h2>`}${testimonials && testimonials.length > 0 && renderTemplate`<div class="grid grid-cols-1 md:grid-cols-2 gap-6">${testimonials.map((testimonial) => renderTemplate`<blockquote class="border border-gray-200 rounded-xl p-6">${testimonial.quote && renderTemplate`<p class="text-lg leading-relaxed mb-5">"${testimonial.quote}"</p>`}${testimonial.name && renderTemplate`<footer class="font-semibold">— ${testimonial.name}</footer>`}</blockquote>`)}</div>`}</div></section>`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/components/TestimonialSection.astro", void 0);
//#endregion
//#region src/pages/[slug].astro
var _slug__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Slug,
	file: () => $$file,
	getStaticPaths: () => getStaticPaths,
	url: () => $$url
});
createAstro("https://sanity-astro-kappa.vercel.app/");
async function getStaticPaths() {
	return await sanityClient.fetch(`*[
  _type == "page" &&
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
	const page = await sanityClient.fetch(`*[
  _type == "page" &&
  basic.slug.current == $slug
][0]`, Astro.params);
	if (!page) throw new Error("Page not found");
	return renderTemplate`${renderComponent($$result, "Main", $$Main, {
		"title": page.seo?.metaTitle || page.title,
		"description": page.seo?.metaDescription || page.meta_description || page.excerpt || ""
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="min-h-screen">${Array.isArray(page.sections) && page.sections.map((section) => {
		switch (section._type) {
			case "heroSection": return renderTemplate`${renderComponent($$result, "HeroSection", $$HeroSection, { ...section })}`;
			case "headingSection": return renderTemplate`${renderComponent($$result, "HeadingSection", $$HeadingSection, { ...section })}`;
			case "ctaSection": return renderTemplate`${renderComponent($$result, "CtaSection", $$CtaSection, { ...section })}`;
			case "faqSection": return renderTemplate`${renderComponent($$result, "FaqSection", $$FaqSection, { ...section })}`;
			case "featureGridSection": return renderTemplate`${renderComponent($$result, "FeatureGridSection", $$FeatureGridSection, { ...section })}`;
			case "testimonialSection": return renderTemplate`${renderComponent($$result, "TestimonialSection", $$TestimonialSection, { ...section })}`;
			default: return null;
		}
	})}</main>` })}`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/pages/[slug].astro", void 0);
var $$file = "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/src/pages/[slug].astro";
var $$url = "/[slug]";
//#endregion
//#region \0virtual:astro:page:src/pages/[slug]@_@astro
var page = () => _slug__exports;
//#endregion
export { page };
