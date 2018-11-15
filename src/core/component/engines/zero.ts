/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import { createComponent } from 'core/component/composite';
import { ComponentOptions, DirectiveOptions, DirectiveFunction } from 'vue';
import { constructors, components } from 'core/component/const';
import { VNode, VNodeData } from 'core/component/engines';

//#if VueInterfaces
export * from 'vue';
export { InjectOptions } from 'vue/types/options';
export { VNode, ScopedSlot } from 'vue/types/vnode';
//#endif

export const minimalCtx = {
	_v: (v) => document.createTextNode(v),
	_s: (v) => v == null ? '' : String(v),
	_e: (v) => document.createComment(v === undefined ? '' : v),
	_t(name: string, fallback: CanArray<Element>, props?: Dictionary, bindObject?: Dictionary): Element[] {
		const
			scopedSlotFn = this.$scopedSlots[name];

		let
			nodes;

		if (scopedSlotFn) {
			props = props || {};

			if (bindObject) {
				props = {...bindObject, ...props};
			}

			nodes = scopedSlotFn(props) || fallback;

		} else {
			const
				slotNodes = this.$slots[name];

			if (slotNodes) {
				slotNodes._rendered = true;
			}

			nodes = slotNodes || fallback;
		}

		const
			target = props && props.slot;

		if (target) {
			return this.$createElement('template', {slot: target}, nodes);
		}

		return nodes;
	},

	_u: (fns, res) => {
		res = res || {};
		for (let i = 0; i < fns.length; i++) {
			if (Array.isArray(fns[i])) {
				this._u(fns[i], res);

			} else {
				res[fns[i].key] = fns[i].fn;
			}
		}

		return res;
	}
};

const
	eventModifiers = {'!': 'capture', '&': 'passive', '~': 'once'},
	eventModifiersRgxp = new RegExp(`^[${Object.keys(eventModifiers).join('')}]+`);

export class ComponentDriver {
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
		return {};
	}

	/**
	 * @param opts
	 */
	constructor(opts: ComponentOptions<any>) {
		const
			{el} = opts,
			[res] = createComponent<Element, ComponentDriver>(opts, this);

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
		this: Dictionary<unknown>,
		tag: string | Node,
		attrs?: VNodeData | Node[],
		children?: Node[]
	): Node {
		if (Object.isString(tag)) {
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

				const baseCtx = Object.assign(Object.create(this), {
					props,
					$createElement: ComponentDriver.prototype.$createElement,

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
							slot = createTemplate();

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

				const [node = minimalCtx._e(''), ctx] =
					createComponent<Element, ComponentDriver>(tag, baseCtx, <ComponentDriver>this);

				if (opts.nativeOn) {
					attachEvents(node, opts.nativeOn);
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

				return node || minimalCtx._e('');
			}

			const
				el = tag === 'template' ? createTemplate() : document.createElement(tag);

			if (opts.directives) {
				for (let o = opts.directives, i = 0; i < o.length; i++) {
					const
						el = o[i];

					switch (el.name) {
						case 'show':
							if (!el.value) {
								opts.attrs = opts.attrs || {};
								opts.attrs.style = (opts.attrs.style || '') + ';display: none;';
							}

							break;

						case 'model':
							opts.domProps = opts.domProps || {};
							opts.domProps.value = el.value;
					}
				}
			}

			if (opts.attrs) {
				for (let o = opts.attrs, keys = Object.keys(o), i = 0; i < keys.length; i++) {
					const key = keys[i];
					el.setAttribute(key, o[key]);
				}
			}

			if (opts.domProps) {
				for (let o = opts.domProps, keys = Object.keys(o), i = 0; i < keys.length; i++) {
					const key = keys[i];
					el[key] = o[key];
				}
			}

			if (el instanceof Element) {
				if (opts.ref) {
					const r = this.$refs = <Dictionary>this.$refs || {};
					r[opts.ref] = el;
				}

				const
					className = (<string[]>[]).concat(opts.staticClass || '', opts.class || []).join(' ').trim();

				if (className) {
					el.className = className;
				}

				if (opts.on) {
					attachEvents(el, opts.on);
				}
			}

			appendChild(el, children);
			return el;
		}

		return tag;
	}
}

function createTemplate(): DocumentFragment & {
	getAttribute(nm: string): void;
	setAttribute(nm: string, val: string): void;
} {
	const
		el = <any>document.createDocumentFragment(),
		attrs = {};

	el.getAttribute = (key) => attrs[key];
	el.setAttribute = (key, val) => attrs[key] = val;

	return el;
}

function attachEvents(el: Node, events: Dictionary<CanArray<Function>>): void {
	for (let keys = Object.keys(events), i = 0; i < keys.length; i++) {
		const
			key = keys[i],
			mods = eventModifiersRgxp.exec(key),
			handlers = (<EventListener[]>[]).concat(<any>events[key] || []),
			flags = {};

		if (mods) {
			for (let o = mods[0], i = 0; i < o.length; i++) {
				flags[eventModifiers[o[i]]] = true;
			}
		}

		for (let i = 0; i < handlers.length; i++) {
			const
				fn = handlers[i];

			if (Object.isFunction(fn)) {
				el.addEventListener(key.replace(eventModifiersRgxp, ''), fn, flags);
			}
		}
	}
}

function appendChild(parent: Node, node: CanArray<Node>): void {
	if (Object.isArray(node)) {
		for (let i = 0; i < node.length; i++) {
			appendChild(parent, node[i]);
		}

	} else {
		parent.appendChild(node);
	}
}