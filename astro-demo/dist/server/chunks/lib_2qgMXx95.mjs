import { C as createAstro, c as renderSlot, d as renderTemplate, f as maybeRenderHead, i as renderComponent, m as addAttribute, t as spreadAttributes } from "./server_Dl94ER1L.mjs";
import { t as createComponent } from "./compiler_DtohOOJ0.mjs";
import { LIST_NEST_MODE_HTML, buildMarksTree, isPortableTextBlock, isPortableTextListItemBlock, isPortableTextToolkitList, isPortableTextToolkitSpan, isPortableTextToolkitTextNode, nestLists } from "@portabletext/toolkit";
//#region node_modules/astro-portabletext/lib/internal.ts
/**
* Returns true if `it` is component
*/
function isComponent(it) {
	return typeof it === "function";
}
/**
* Merges two {@link SomePortableTextComponents} objects, giving priority to overrides.
*
* This function combines two component objects used in Portable Text rendering.
* If both objects have the same key, the value from `overrides` takes precedence.
* This is useful for customizing the rendering of specific components while keeping
* the default behavior for others.
*
* @typeParam Components - The type of the base components object.
* @typeParam Overrides - The type of the overrides components object.
* @typeParam MergedComponents - The type of the resulting merged components object.
*
* @param components - The base components object.
* @param overrides - The overrides components object.
* @returns A new object with the merged components.
*/
function mergeComponents(components, overrides) {
	const cmps = { ...components };
	for (const [key, override] of Object.entries(overrides)) {
		const current = components[key];
		cmps[key] = !current || isComponent(override) || isComponent(current) ? override : {
			...current,
			...override
		};
	}
	return cmps;
}
var nodeComponentsMap = /* @__PURE__ */ new WeakMap();
/**
* Binds the resolved components to a specific node object.
* @internal
*
* @remarks
* This uses the node's _object reference_ as the key. This enables the `Context` API via
* `usePortableText` to look up which components were assigned to this specific node during rendering.
*
* @param node - The node object to be used as the key.
* @param Default - The resolved default component for this node.
* @param Unknown - The resolved fallback (unknown) component for this node.
*/
function setNodeComponents(node, Default, Unknown) {
	nodeComponentsMap.set(node, {
		Default,
		Unknown
	});
}
/**
* Retrieves the components bound to a specific node object.
* @internal
*
* @param node - The node object to look up (by reference).
* @returns The component pair, or `undefined` if this exact node object was not registered.
*/
function getNodeComponents(node) {
	return nodeComponentsMap.get(node);
}
//#endregion
//#region node_modules/astro-portabletext/lib/warnings.ts
var getTemplate = (prop, type) => `PortableText [components.${prop}] is missing "${type}"`;
var unknownTypeWarning = (type) => getTemplate("type", type);
var unknownMarkWarning = (markType) => getTemplate("mark", markType);
var unknownBlockWarning = (style) => getTemplate("block", style);
var unknownListWarning = (listItem) => getTemplate("list", listItem);
var unknownListItemWarning = (listStyle) => getTemplate("listItem", listStyle);
var getWarningMessage = (nodeType, type) => {
	return {
		block: unknownBlockWarning,
		list: unknownListWarning,
		listItem: unknownListItemWarning,
		mark: unknownMarkWarning,
		type: unknownTypeWarning
	}[nodeType](type);
};
function printWarning(message) {
	console.warn(message);
}
//#endregion
//#region node_modules/astro-portabletext/lib/context.ts
var key = Symbol("astro-portabletext");
/**
* Returns rendering utilities for a node within a Portable Text tree.
* Must be called from a component passed to the PortableText `components` prop.
*
* @param node - The Portable Text node passed into the component.
* @returns Component resolution and render utilities.
*/
function usePortableText(node) {
	if (!(key in globalThis)) throw new Error(`PortableText "context" has not been initialised`);
	return globalThis[key](node);
}
//#endregion
//#region node_modules/astro-portabletext/components/Block.astro
createAstro("https://sanity-astro-kappa.vercel.app/");
var $$Block = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Block;
	const props = Astro.props;
	const { node, index, isInline, ...attrs } = props;
	const styleIs = (style) => style === node.style;
	const { getUnknownComponent } = usePortableText(node);
	const UnknownStyle = getUnknownComponent();
	return renderTemplate`${styleIs("h1") ? renderTemplate`${maybeRenderHead($$result)}<h1${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</h1>` : styleIs("h2") ? renderTemplate`<h2${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</h2>` : styleIs("h3") ? renderTemplate`<h3${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</h3>` : styleIs("h4") ? renderTemplate`<h4${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</h4>` : styleIs("h5") ? renderTemplate`<h5${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</h5>` : styleIs("h6") ? renderTemplate`<h6${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</h6>` : styleIs("blockquote") ? renderTemplate`<blockquote${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</blockquote>` : styleIs("normal") ? renderTemplate`<p${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</p>` : renderTemplate`${renderComponent($$result, "UnknownStyle", UnknownStyle, { ...props }, { "default": ($$result) => renderTemplate`${renderSlot($$result, $$slots["default"])}` })}`}`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/node_modules/astro-portabletext/components/Block.astro", void 0);
//#endregion
//#region node_modules/astro-portabletext/components/HardBreak.astro
var $$HardBreak = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${maybeRenderHead($$result)}<br>`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/node_modules/astro-portabletext/components/HardBreak.astro", void 0);
//#endregion
//#region node_modules/astro-portabletext/components/List.astro
createAstro("https://sanity-astro-kappa.vercel.app/");
var $$List = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$List;
	const { node, index, isInline, ...attrs } = Astro.props;
	const listItemIs = (listItem) => listItem === node.listItem;
	return renderTemplate`${listItemIs("menu") ? renderTemplate`${maybeRenderHead($$result)}<menu${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</menu>` : listItemIs("number") ? renderTemplate`<ol${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</ol>` : renderTemplate`<ul${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</ul>`}`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/node_modules/astro-portabletext/components/List.astro", void 0);
//#endregion
//#region node_modules/astro-portabletext/components/ListItem.astro
createAstro("https://sanity-astro-kappa.vercel.app/");
var $$ListItem = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$ListItem;
	const { node, index, isInline, ...attrs } = Astro.props;
	return renderTemplate`${maybeRenderHead($$result)}<li${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</li>`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/node_modules/astro-portabletext/components/ListItem.astro", void 0);
//#endregion
//#region node_modules/astro-portabletext/components/Mark.astro
createAstro("https://sanity-astro-kappa.vercel.app/");
var $$Mark = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Mark;
	const props = Astro.props;
	const { node, index, isInline, ...attrs } = props;
	const markTypeIs = (markType) => markType === node.markType;
	const { getUnknownComponent } = usePortableText(node);
	const UnknownMarkType = getUnknownComponent();
	return renderTemplate`${markTypeIs("code") ? renderTemplate`${maybeRenderHead($$result)}<code${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</code>` : markTypeIs("em") ? renderTemplate`<em${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</em>` : markTypeIs("link") ? renderTemplate`<a${addAttribute(node.markDef.href, "href")}${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</a>` : markTypeIs("strike-through") ? renderTemplate`<del${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</del>` : markTypeIs("strong") ? renderTemplate`<strong${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</strong>` : markTypeIs("underline") ? renderTemplate`<span style="text-decoration: underline;"${spreadAttributes(attrs)}>${renderSlot($$result, $$slots["default"])}</span>` : renderTemplate`${renderComponent($$result, "UnknownMarkType", UnknownMarkType, { ...props }, { "default": ($$result) => renderTemplate`${renderSlot($$result, $$slots["default"])}` })}`}`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/node_modules/astro-portabletext/components/Mark.astro", void 0);
//#endregion
//#region node_modules/astro-portabletext/components/Text.astro
createAstro("https://sanity-astro-kappa.vercel.app/");
var $$Text = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Text;
	const { node } = Astro.props;
	return renderTemplate`${node.text}`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/node_modules/astro-portabletext/components/Text.astro", void 0);
//#endregion
//#region node_modules/astro-portabletext/components/UnknownBlock.astro
var $$UnknownBlock = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${maybeRenderHead($$result)}<p data-portabletext-unknown="block">${renderSlot($$result, $$slots["default"])}</p>`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/node_modules/astro-portabletext/components/UnknownBlock.astro", void 0);
//#endregion
//#region node_modules/astro-portabletext/components/UnknownList.astro
var $$UnknownList = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${maybeRenderHead($$result)}<ul data-portabletext-unknown="list">${renderSlot($$result, $$slots["default"])}</ul>`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/node_modules/astro-portabletext/components/UnknownList.astro", void 0);
//#endregion
//#region node_modules/astro-portabletext/components/UnknownListItem.astro
var $$UnknownListItem = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${maybeRenderHead($$result)}<li data-portabletext-unknown="listitem">${renderSlot($$result, $$slots["default"])}</li>`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/node_modules/astro-portabletext/components/UnknownListItem.astro", void 0);
//#endregion
//#region node_modules/astro-portabletext/components/UnknownMark.astro
var $$UnknownMark = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${maybeRenderHead($$result)}<span data-portabletext-unknown="mark">${renderSlot($$result, $$slots["default"])}</span>`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/node_modules/astro-portabletext/components/UnknownMark.astro", void 0);
//#endregion
//#region node_modules/astro-portabletext/components/UnknownType.astro
createAstro("https://sanity-astro-kappa.vercel.app/");
var $$UnknownType = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$UnknownType;
	const { node, isInline } = Astro.props;
	const warning = getWarningMessage("type", node._type);
	return renderTemplate`${isInline ? renderTemplate`${maybeRenderHead($$result)}<span style="display:none" data-portabletext-unknown="type">${warning}</span>` : renderTemplate`<div style="display:none" data-portabletext-unknown="type">${warning}</div>`}`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/node_modules/astro-portabletext/components/UnknownType.astro", void 0);
//#endregion
//#region node_modules/astro-portabletext/components/PortableText.astro
createAstro("https://sanity-astro-kappa.vercel.app/");
var $$PortableText = createComponent(($$result, $$props, $$slots) => {
	const Astro2 = $$result.createAstro($$props, $$slots);
	Astro2.self = $$PortableText;
	const { value, components: componentOverrides = {}, listNestingMode = LIST_NEST_MODE_HTML, onMissingComponent = true } = Astro2.props;
	const components = mergeComponents({
		type: {},
		unknownType: $$UnknownType,
		block: {
			h1: $$Block,
			h2: $$Block,
			h3: $$Block,
			h4: $$Block,
			h5: $$Block,
			h6: $$Block,
			blockquote: $$Block,
			normal: $$Block
		},
		unknownBlock: $$UnknownBlock,
		list: {
			bullet: $$List,
			number: $$List,
			menu: $$List
		},
		unknownList: $$UnknownList,
		listItem: {
			bullet: $$ListItem,
			number: $$ListItem,
			menu: $$ListItem
		},
		unknownListItem: $$UnknownListItem,
		mark: {
			code: $$Mark,
			em: $$Mark,
			link: $$Mark,
			"strike-through": $$Mark,
			strong: $$Mark,
			underline: $$Mark
		},
		unknownMark: $$UnknownMark,
		text: $$Text,
		hardBreak: $$HardBreak
	}, componentOverrides);
	const noop = () => {};
	const missingComponentHandler = ((handler) => {
		if (typeof handler === "function") return handler;
		return !handler ? noop : printWarning;
	})(onMissingComponent);
	const asComponentProps = (node, index, isInline) => ({
		node,
		index,
		isInline
	});
	const provideComponent = (nodeType, type, fallbackComponent) => {
		const component = ((component2) => {
			return component2[type] || component2;
		})(components[nodeType]);
		if (isComponent(component)) return component;
		missingComponentHandler(getWarningMessage(nodeType, type), {
			nodeType,
			type
		});
		return fallbackComponent;
	};
	let fallbackRenderOptions;
	const portableTextRender = (options, isInline) => {
		if (!fallbackRenderOptions) throw new Error("[PortableText portableTextRender] fallbackRenderOptions is undefined");
		const renderChildren = (children, inline = false) => {
			return children?.map(portableTextRender(options, inline)) ?? [];
		};
		const renderOptions = {
			...fallbackRenderOptions,
			...options ?? {}
		};
		return function renderNode(node, index) {
			function run(handler, props) {
				if (!isComponent(handler)) throw new Error(`[PortableText render] No handler found for node type ${node._type}.`);
				return handler(props);
			}
			if (isPortableTextToolkitList(node)) {
				const UnknownComponent2 = components.unknownList ?? $$UnknownList;
				setNodeComponents(node, $$List, UnknownComponent2);
				return run(renderOptions.list, {
					Component: provideComponent("list", node.listItem, UnknownComponent2),
					props: asComponentProps(node, index, false),
					children: renderChildren(node.children, false)
				});
			}
			if (isPortableTextListItemBlock(node)) {
				const nodeCopy = { ...node };
				const { listItem, ...blockNode } = nodeCopy;
				const isStyled = nodeCopy.style && nodeCopy.style !== "normal";
				nodeCopy.children = isStyled ? renderNode(blockNode, index) : buildMarksTree(nodeCopy);
				const UnknownComponent2 = components.unknownListItem ?? $$UnknownListItem;
				setNodeComponents(nodeCopy, $$ListItem, UnknownComponent2);
				return run(renderOptions.listItem, {
					Component: provideComponent("listItem", listItem, UnknownComponent2),
					props: asComponentProps(nodeCopy, index, false),
					children: isStyled ? nodeCopy.children : renderChildren(nodeCopy.children, true)
				});
			}
			if (isPortableTextToolkitSpan(node)) {
				const UnknownComponent2 = components.unknownMark ?? $$UnknownMark;
				setNodeComponents(node, $$Mark, UnknownComponent2);
				return run(renderOptions.mark, {
					Component: provideComponent("mark", node.markType, UnknownComponent2),
					props: asComponentProps(node, index, true),
					children: renderChildren(node.children, true)
				});
			}
			if (isPortableTextBlock(node)) {
				const nodeCopy = { ...node };
				nodeCopy.style ??= "normal";
				nodeCopy.children = buildMarksTree(nodeCopy);
				const UnknownComponent2 = components.unknownBlock ?? $$UnknownBlock;
				setNodeComponents(nodeCopy, $$Block, UnknownComponent2);
				return run(renderOptions.block, {
					Component: provideComponent("block", nodeCopy.style, UnknownComponent2),
					props: asComponentProps(nodeCopy, index, false),
					children: renderChildren(nodeCopy.children, true)
				});
			}
			if (isPortableTextToolkitTextNode(node)) {
				const isHardBreak = "\n" === node.text;
				const props = asComponentProps(node, index, true);
				if (isHardBreak) return run(renderOptions.hardBreak, {
					Component: isComponent(components.hardBreak) ? components.hardBreak : $$HardBreak,
					props
				});
				return run(renderOptions.text, {
					Component: isComponent(components.text) ? components.text : $$Text,
					props
				});
			}
			const UnknownComponent = components.unknownType ?? $$UnknownType;
			return run(renderOptions.type, {
				Component: provideComponent("type", node._type, UnknownComponent),
				props: asComponentProps(node, index, isInline ?? false)
			});
		};
	};
	globalThis[key] = (node) => ({
		getDefaultComponent: provideDefaultComponent.bind(null, node),
		getUnknownComponent: provideUnknownComponent.bind(null, node),
		render: (options) => node.children?.map(portableTextRender(options))
	});
	const provideDefaultComponent = (node) => {
		const DefaultComponent = getNodeComponents(node)?.Default;
		if (DefaultComponent) return DefaultComponent;
		if (isPortableTextToolkitList(node)) return $$List;
		if (isPortableTextListItemBlock(node)) return $$ListItem;
		if (isPortableTextToolkitSpan(node)) return $$Mark;
		if (isPortableTextBlock(node)) return $$Block;
		if (isPortableTextToolkitTextNode(node)) return "\n" === node.text ? $$HardBreak : $$Text;
		return $$UnknownType;
	};
	const provideUnknownComponent = (node) => {
		const UnknownComponent = getNodeComponents(node)?.Unknown;
		if (UnknownComponent) return UnknownComponent;
		if (isPortableTextToolkitList(node)) return components.unknownList ?? $$UnknownList;
		if (isPortableTextListItemBlock(node)) return components.unknownListItem ?? $$UnknownListItem;
		if (isPortableTextToolkitSpan(node)) return components.unknownMark ?? $$UnknownMark;
		if (isPortableTextBlock(node)) return components.unknownBlock ?? $$UnknownBlock;
		if (!isPortableTextToolkitTextNode(node)) return components.unknownType ?? $$UnknownType;
		throw new Error(`[PortableText getUnknownComponent] Unable to provide component with node type ${node._type}`);
	};
	const nodes = nestLists(Array.isArray(value) ? value : value ? [value] : [], listNestingMode);
	const render = (options) => {
		fallbackRenderOptions = options;
		return portableTextRender(options);
	};
	const createSlotRenderer = (slotName) => Astro2.slots.render.bind(Astro2.slots, slotName);
	const slots = [
		"type",
		"block",
		"list",
		"listItem",
		"mark",
		"text",
		"hardBreak"
	].reduce((obj, name) => {
		obj[name] = Astro2.slots.has(name) ? createSlotRenderer(name) : void 0;
		return obj;
	}, {});
	return renderTemplate`${(() => {
		const renderNode = (slotRenderer) => {
			return ({ Component, props, children }) => slotRenderer?.([{
				Component,
				props,
				children
			}]) ?? renderTemplate`${renderComponent($$result, "Component", Component, { ...props }, { "default": ($$result2) => renderTemplate`${children}` })}`;
		};
		return nodes.map(render({
			type: renderNode(slots.type),
			block: renderNode(slots.block),
			list: renderNode(slots.list),
			listItem: renderNode(slots.listItem),
			mark: renderNode(slots.mark),
			text: renderNode(slots.text),
			hardBreak: renderNode(slots.hardBreak)
		}));
	})()}`;
}, "/Users/phillippereira/Desktop/VSC/sanity-astro/astro-demo/node_modules/astro-portabletext/components/PortableText.astro", void 0);
//#endregion
export { $$PortableText as t };
