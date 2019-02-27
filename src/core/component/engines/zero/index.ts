/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import { createComponent } from 'core/component/composite';
import { ComponentInterface } from 'core/component/interface';
import { ComponentOptions, DirectiveOptions, DirectiveFunction, RenderContext } from 'vue';
import { constructors, components } from 'core/component/const';
import { VNode, VNodeData as BaseVNodeData } from 'vue/types/vnode';

import config from 'core/component/engines/zero/config';
import * as _ from 'core/component/engines/zero/helpers';

export { default as minimalCtx } from 'core/component/engines/zero/ctx';

//#if VueInterfaces
export * from 'vue';
export { InjectOptions } from 'vue/types/options';
export { VNode, ScopedSlot } from 'vue/types/vnode';
//#endif

export interface VNodeData extends BaseVNodeData {
	model?: {
		expression: string;
		value: unknown;
		callback(value: unknown): void;
	};
}

export interface Options extends Dictionary {
	filters: Dictionary<Function>;
	directives: Dictionary<DirectiveOptions>;
}

export const supports = {
	functional: false
};

export const options: Options = {
	filters: {},
	directives: {}
};

/**
 * Patches the specified virtual node: add classes, event handlers, etc.
 *
 * @param vNode
 * @param ctx - component fake context
 * @param renderCtx - render context
 */
export function patchVNode(vNode: Element, ctx: ComponentInterface, renderCtx: RenderContext): void {
	const
		{data} = renderCtx,
		// @ts-ignore
		{meta} = ctx;

	_.addClass(vNode, data);

	if (data.attrs && meta.params.inheritAttrs) {
		_.addAttrs(vNode, data.attrs);
	}

	_.addStaticDirectives(ctx, data, vNode[_.$$.directives], vNode);
}

export class ComponentDriver {
	static config: typeof config = config;

	/**
	 * Shim for Vue.component
	 *
	 * @param id
	 * @param factory
	 */
	static component(id: string, factory: any): Promise<ComponentOptions<any>> {
		if (Object.isFunction(factory)) {
			return new Promise(factory);
		}

		return Promise.resolve(factory);
	}

	/**
	 * Shim for Vue.directive
	 *
	 * @param id
	 * @param [definition]
	 */
	static directive(id: string, definition?: DirectiveOptions | DirectiveFunction): DirectiveOptions {
		const
			obj = <DirectiveOptions>{};

		if (Object.isFunction(definition)) {
			obj.bind = definition;
			obj.update = definition;

		} else if (definition) {
			Object.assign(obj, definition);
		}

		options.directives[id] = obj;
		return obj;
	}

	/**
	 * Shim for Vue.filter
	 *
	 * @param id
	 * @param [definition]
	 */
	static filter(id: string, definition?: Function): Function {
		return options.filters[id] = definition || Any;
	}

	/**
	 * Component options
	 */
	$options: Dictionary = {...options};

	/**
	 * @param opts
	 */
	constructor(opts: ComponentOptions<any>) {
		const
			{el} = opts,
			[res] = createComponent<Element>(opts, <any>this);

		if (el && res) {
			if (Object.isString(el)) {
				const
					node = document.querySelector(el);

				if (node) {
					node.appendChild(res);
				}

				return;
			}

			el.appendChild(res);
		}
	}

	/**
	 * Shim for Vue.$createElement
	 *
	 * @param tag
	 * @param attrs
	 * @param children
	 */
	$createElement(
		this: ComponentInterface,
		tag: string | Node,
		attrs?: VNodeData | Node[],
		children?: Node[]
	): Node {
		if (Object.isString(tag)) {
			const
				// @ts-ignore
				refs = this.$refs = this.$refs || {};

			let
				opts: VNodeData;

			if (Object.isObject(attrs)) {
				children = (<Node[]>[]).concat(children || []);
				opts = <VNodeData>attrs;

			} else {
				children = (<Node[]>[]).concat(attrs || []);
				opts = {};
			}

			const
				constr = constructors[tag],
				meta = constr && components.get(constr);

			if (meta) {
				const
					props = {},
					attrs = {};

				if (opts.attrs) {
					for (let o = opts.attrs, keys = Object.keys(o), i = 0; i < keys.length; i++) {
						const
							key = keys[i],
							nm = key.camelize(false),
							val = o[key];

						if (meta.props[nm]) {
							props[nm] = val;

						} else {
							attrs[key] = val;
						}
					}
				}

				const
					componentModel = meta.params.model;

				if (opts.model && componentModel) {
					const
						{prop, event} = componentModel;

					if (prop && event) {
						props[prop] = opts.model.value;
						opts.on = opts.on || {};
						opts.on[event] = opts.model.callback;
					}
				}

				const baseCtx = Object.assign(Object.create(this), {
					props,

					$createElement: ComponentDriver.prototype.$createElement,
					$options: {...options},

					data: {
						attrs,
						on: opts.on
					},

					slots: () => {
						const
							res = <Dictionary>{};

						if (!children || !children.length) {
							return res;
						}

						const
							f = <Element>children[0];

						if (f.getAttribute && f.getAttribute('slot')) {
							for (let i = 0; i < children.length; i++) {
								const
									slot = <Element>children[i],
									key = slot.getAttribute('slot');

								if (!key) {
									continue;
								}

								res[key] = slot;
							}

							return res;
						}

						let
							slot;

						if (children.length === 1) {
							slot = f;

						} else {
							slot = _.createTemplate();

							for (let o = Array.from(children), i = 0; i < o.length; i++) {
								slot.appendChild(o[i]);
							}
						}

						res.default = slot;
						return res;
					},

					scopedSlots: () => {
						const
							res = {};

						if (opts.scopedSlots) {
							for (let o = opts.scopedSlots, keys = Object.keys(o), i = 0; i < keys.length; i++) {
								const key = keys[i];
								res[key] = o[key];
							}
						}

						return res;
					}
				});

				const [node, ctx] =
					createComponent<Element>(tag, baseCtx, this);

				if (node) {
					node[_.$$.data] = opts;

					_.addStaticDirectives(this, opts, opts.directives, node);
					_.addDirectives(this, node, opts, opts.directives);
					_.addClass(node, opts);
					_.attachEvents(node, opts.nativeOn);
					_.addStyles(node, opts.style);

					if (opts.ref) {
						refs[opts.ref] = ctx;
					}

					if (meta.params.inheritAttrs) {
						_.addAttrs(node, attrs);
					}
				}

				if (opts.on) {
					for (let o = opts.on, keys = Object.keys(o), i = 0; i < keys.length; i++) {
						const
							key = keys[i],
							fns = (<Function[]>[]).concat(o[key]);

						for (let i = 0; i < fns.length; i++) {
							const
								fn = fns[i];

							if (Object.isFunction(fn)) {
								// @ts-ignore
								ctx.$on(key, fn);
							}
						}
					}
				}

				return node || document.createComment('');
			}

			let
				node;

			switch (tag) {
				case 'template':
					node = _.createTemplate();
					break;

				case 'svg':
					node = document.createElementNS(_.SVG_NMS, tag);
					break;

				default:
					node = document.createElement(tag);
			}

			node[_.$$.data] = opts;
			_.addStaticDirectives(this, opts, opts.directives, node);
			_.addDirectives(this, node, opts, opts.directives);

			if (node instanceof Element) {
				if (opts.ref) {
					refs[opts.ref] = node;
				}

				_.addClass(node, opts);
				_.attachEvents(node, opts.on);
			}

			_.addProps(node, opts.domProps);
			_.addStyles(node, opts.style);
			_.addAttrs(node, opts.attrs);

			if (node instanceof SVGElement) {
				children = _.createSVGChildren(this, <Element[]>children);
			}

			_.appendChild(node, children);
			return node;
		}

		return tag;
	}
}