/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import iBlock from 'super/i-block/i-block';

import Opt from 'super/i-block/modules/opt';
import Field from 'super/i-block/modules/field';
import Provide from 'super/i-block/modules/provide';

import {

	renderData,
	patchVNode,
	execRenderObject,
	RenderObject,
	RenderContext,
	VNode,
	ScopedSlot

} from 'core/component';

const
	tplCache = Object.createDict<RenderObject>();

export default class VDOM {
	/**
	 * Component instance
	 */
	protected readonly component: iBlock;

	/**
	 * @param component - component instance
	 */
	constructor(component: iBlock) {
		this.component = component;
	}

	/**
	 * Renders the specified data
	 * @param data
	 */
	render(data: VNode): Node;
	render(data: VNode[]): Node[];
	render(data: CanArray<VNode>): CanArray<Node> {
		return renderData(<any>data, this.component);
	}

	/**
	 * Returns a render object by the specified path
	 * @param path - template path (bExample | bExample.foo ...)
	 */
	getRenderObject(path: string): CanUndef<RenderObject> {
		const chunks = path.split('.');
		chunks[0] = chunks[0].dasherize();

		const
			key = chunks.join('.'),
			cache = tplCache[key];

		if (cache) {
			return cache;
		}

		const
			tpl = TPLS[chunks[0]];

		if (!tpl) {
			return;
		}

		const
			fn = chunks.length === 1 ? tpl.index : Object.get(tpl, chunks.slice(1));

		if (Object.isFunction(fn)) {
			return tplCache[key] = fn();
		}
	}

	/**
	 * Executes the specified render object
	 *
	 * @param renderObj
	 * @param [ctx] - render context
	 */
	execRenderObject(
		renderObj: RenderObject,
		ctx?: RenderContext | [Dictionary] | [Dictionary, RenderContext]
	): VNode {
		let
			instanceCtx,
			renderCtx;

		if (ctx && Object.isArray(ctx)) {
			instanceCtx = ctx[0] || this.component;
			renderCtx = ctx[1];

			if (instanceCtx !== instanceCtx.provide.component) {
				instanceCtx.field = new Field(instanceCtx);
				instanceCtx.provide = new Provide(instanceCtx);
				instanceCtx.opts = new Opt(instanceCtx);
			}

		} else {
			instanceCtx = this.component;
			renderCtx = ctx;
		}

		const
			vnode = execRenderObject(renderObj, instanceCtx);

		if (renderCtx) {
			return patchVNode(vnode, instanceCtx, renderCtx);
		}

		return vnode;
	}

	/**
	 * Returns a link to the closest parent component for the current
	 * @param component - component name or a link to the component constructor
	 */
	closest<T extends iBlock = iBlock>(component: string | ClassConstructor<T>): CanUndef<T> {
		const
			nm = Object.isString(component) ? component.dasherize() : undefined;

		let
			el = <CanUndef<T>>this.component.$parent;

		while (el) {
			if (Object.isFunction(component) && el.instance instanceof component || el.componentName === nm) {
				return el;
			}

			el = <CanUndef<T>>el.$parent;
		}

		return undefined;
	}

	/**
	 * Searches an element by the specified name from a virtual node
	 *
	 * @param vnode
	 * @param elName
	 * @param [ctx] - component context
	 */
	findElFromVNode<T extends iBlock>(
		vnode: VNode,
		elName: string,
		// @ts-ignore
		ctx: T = this.component
	): CanUndef<VNode> {
		const
			selector = ctx.provide.fullElName(elName);

		const search = (vnode) => {
			const
				data = vnode.data || {};

			const classes = Object.fromArray([].concat(
				(data.staticClass || '').split(' '),
				data.class || []
			));

			if (classes[selector]) {
				return vnode;
			}

			if (vnode.children) {
				for (let i = 0; i < vnode.children.length; i++) {
					const
						res = search(vnode.children[i]);

					if (res) {
						return res;
					}
				}
			}

			return undefined;
		};

		return search(vnode);
	}

	/**
	 * Returns a slot by the specified name
	 *
	 * @param name
	 * @param ctx
	 */
	getSlot<T extends iBlock>(
		name: string,
		// @ts-ignore
		ctx: T = this.component
	): CanUndef<VNode | ScopedSlot> {
		return Object.get(ctx, `$slots.${name}`) || Object.get(ctx, `$scopedSlots.${name}`);
	}
}
