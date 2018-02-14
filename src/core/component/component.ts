/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import Vue, { ComponentOptions } from 'vue';
import { ComponentMeta } from 'core/component';

export interface ComponentConstructor<T = any> {
	new(): T;
}

/**
 * Returns an object for the Vue component
 *
 * @param constructor
 * @param meta
 */
export function getComponent(
	constructor: ComponentConstructor,
	meta: ComponentMeta
): ComponentOptions<Vue & {$activeField: string}> {
	const
		{mods, component, instance} = getBaseComponent(constructor, meta),
		{methods} = meta,
		p = meta.params;

	return {
		...p.mixins,
		...component,

		provide: p.provide,
		inject: p.inject,

		data(): Dictionary {
			const
				data = {} as Dictionary;

			for (let o = meta.fields, keys = Object.keys(o), i = 0; i < keys.length; i++) {
				const
					key = this.$activeField = keys[i],
					el = o[key];

				let val;
				if (el.init) {
					val = el.init(<any>this, instance);
				}

				// tslint:disable-next-line
				if (val === undefined) {
					data[key] = el.default !== undefined ? el.default : Object.fastClone(instance[key]);

				} else {
					data[key] = val;
				}
			}

			data.mods = mods;
			return data;
		},

		beforeCreate(): void {
			for (let o = meta.accessors, keys = Object.keys(o), i = 0; i < keys.length; i++) {
				const
					key = keys[i],
					el = o[key];

				Object.defineProperty(this, keys[i], {
					get: el.get,
					set: el.set
				});
			}

			for (let o = meta.systemFields, keys = Object.keys(o), i = 0; i < keys.length; i++) {
				const
					key = keys[i],
					el = o[key];

				let val;
				if (el.init) {
					val = el.init(<any>this, instance);
				}

				// tslint:disable-next-line
				if (val === undefined) {
					this[key] = el.default !== undefined ? el.default : Object.fastClone(instance[key]);

				} else {
					this[key] = val;
				}
			}

			methods.beforeCreate && methods.beforeCreate.fn.call(this);
			runHooks('beforeCreate', meta);
		},

		created(): void {
			for (let o = meta.watchers, keys = Object.keys(o), i = 0; i < keys.length; i++) {
				const key = keys[i];
				this.$watch(key, o[key]);
			}

			methods.created && methods.created.fn.call(this);
			runHooks('created', meta);
		},

		beforeMount(): void {
			methods.beforeMount && methods.beforeMount.fn.call(this);
			runHooks('beforeMount', meta);
		},

		mounted(): void {
			methods.mounted && methods.mounted.fn.call(this);
			runHooks('mounted', meta);
		},

		beforeUpdate(): void {
			methods.beforeUpdate && methods.beforeUpdate.fn.call(this);
			runHooks('beforeUpdate', meta);
		},

		updated(): void {
			methods.updated && methods.updated.fn.call(this);
			runHooks('updated', meta);
		},

		activated(): void {
			methods.activated && methods.activated.fn.call(this);
			runHooks('activated', meta);
		},

		deactivated(): void {
			methods.deactivated && methods.deactivated.fn.call(this);
			runHooks('deactivated', meta);
		},

		beforeDestroy(): void {
			methods.beforeDestroy && methods.beforeDestroy.fn.call(this);
			runHooks('beforeDestroy', meta);
		},

		destroyed(): void {
			methods.destroyed && methods.destroyed.fn.call(this);
			runHooks('destroyed', meta);
		}
	};
}

/**
 * Runs a hook from the specified meta object
 *
 * @param hook
 * @param meta
 */
function runHooks(hook: string, meta: ComponentMeta): void {
	const event = {
		queue: [] as Function[],
		events: {} as Dictionary<{event: Set<string>; cb: Function}[]>,

		on(event: Set<string>, cb: Function): void {
			if (event.size) {
				for (let v = event.values(), el = v.next(); !el.done; el = v.next()) {
					this.events[el.value] = this.events[el.value] || [];
					this.events[el.value].push({event, cb});
				}

				return;
			}

			this.queue.push(cb);
		},

		emit(event: string): void {
			if (!this.events[event]) {
				return;
			}

			for (let o = this.events[event], i = 0; i < o.length; i++) {
				const el = o[i];
				el.event.delete(event);
				!el.event.size && el.cb();
			}
		},

		fire(): void {
			for (let i = 0; i < this.queue.length; i++) {
				this.queue[i]();
			}
		}
	};

	for (let hooks = meta.hooks[hook], i = 0; i < hooks.length; i++) {
		const
			el = hooks[i];

		event.on(el.after, () => {
			el.fn.call(this);
			event.emit(el.fn.name);
		});
	}

	event.fire();
}

/**
 * Returns a base component object from the specified constructor
 *
 * @param constructor
 * @param meta
 */
function getBaseComponent(
	constructor: ComponentConstructor,
	meta: ComponentMeta
): {
	mods: Dictionary<string | undefined>;
	component: ComponentMeta['component'];
	instance: Dictionary;
} {
	addMethodsToMeta(constructor, meta);

	const
		{component, watchers} = meta,
		instance = new constructor();

	for (let o = meta.props, keys = Object.keys(meta.props), i = 0; i < keys.length; i++) {
		const
			key = keys[i],
			prop = o[key];

		if (component.props) {
			component.props[key] = {
				type: prop.type,
				required: prop.required,
				validator: prop.validator,
				default: prop.default !== undefined ? prop.default : Object.fastClone(instance[key])
			};
		}

		watchers[key] = watchers[key] || [];
		for (let w = prop.watchers.values(), el = w.next(); !el.done; el = w.next()) {
			const
				val = el.value;

			watchers[key].push({
				deep: val.deep,
				immediate: val.immediate,
				handler: val.fn
			});
		}
	}

	for (let o = meta.fields, keys = Object.keys(meta.fields), i = 0; i < keys.length; i++) {
		const
			key = keys[i],
			field = o[key];

		watchers[key] = watchers[key] || [];
		for (let w = field.watchers.values(), el = w.next(); !el.done; el = w.next()) {
			const
				val = el.value;

			watchers[key].push({
				deep: val.deep,
				immediate: val.immediate,
				handler: val.fn
			});
		}
	}

	const
		mods = {};

	for (let o = meta.mods, keys = Object.keys(o), i = 0; i < keys.length; i++) {
		const
			key = keys[i],
			mod = o[key];

		let def;
		if (mod) {
			for (let i = 0; i < mod.length; i++) {
				const
					el = mod[i];

				if (Object.isArray(el)) {
					def = el;
					break;
				}
			}

			mods[key] = def ? String(def[0]) : undefined;
		}
	}

	return {mods, component, instance};
}

/**
 * Iterates the specified constructor prototype and adds methods/accessors to the meta object
 *
 * @param constructor
 * @param meta
 */
function addMethodsToMeta(constructor: Function, meta: ComponentMeta): void {
	const
		{component, watchers, hooks} = meta;

	const
		proto = constructor.prototype,
		ownProps = Object.getOwnPropertyNames(proto);

	for (let i = 0; i < ownProps.length; i++) {
		const
			key = ownProps[i];

		if (key === 'constructor') {
			continue;
		}

		const
			desc = <PropertyDescriptor>Object.getOwnPropertyDescriptor(proto, key);

		if ('value' in desc) {
			if (component.methods) {
				component.methods[key] = desc.value;
			}

			// tslint:disable-next-line
			const method = meta.methods[key] = Object.assign(meta.methods[key] || {}, {
				fn: desc.value
			});

			for (let o = method.watchers, keys = Object.keys(o), i = 0; i < keys.length; i++) {
				const
					key = keys[i],
					el = o[key];

				watchers[key] = watchers[key] || [];
				watchers[key].push({
					deep: el.deep,
					immediate: el.immediate,
					handler: method.fn
				});
			}

			for (let o = method.hooks, keys = Object.keys(o), i = 0; i < keys.length; i++) {
				const key = keys[i];
				hooks[key] = hooks[key] || [];
				hooks[key].push({fn: method.fn, after: o[key].after});
			}

		} else {
			const
				metaKey = key in meta.accessors ? 'accessors' : 'computed',
				obj = meta[metaKey];

			const
				old = obj[key],
				set = desc.set || old && old.set;

			if (set) {
				meta.methods[`${key}Setter`] = {
					fn: set,
					watchers: {},
					hooks: {}
				};
			}

			Object.assign(obj, {
				[key]: {
					get: desc.get || old && old.get,
					set
				}
			});

			if (metaKey === 'computed' && component.computed) {
				const method = obj[key];
				component.computed[key] = {
					get: method.get,
					set: method.set
				};
			}
		}
	}
}
