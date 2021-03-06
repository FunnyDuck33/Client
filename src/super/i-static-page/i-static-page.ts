/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import symbolGenerator from 'core/symbol';
import remoteState from 'core/component/state';

import { reset, globalEvent, ResetType, ComponentInterface } from 'core/component';
import { setLang, lang } from 'core/i18n';

import { SetEvent } from 'core/session';
import { StatusEvent } from 'core/net';

import iBlock from 'super/i-block/i-block';
import bRouter, { CurrentPage } from 'base/b-router/b-router';
import iPage, { component, field, system, watch, Event } from 'super/i-page/i-page';

export * from 'super/i-data/i-data';
export { globalEvent, ResetType, CurrentPage };

export type RootMods = Dictionary<{
	mod: string;
	value: string;
	component: ComponentInterface;
}>;

export const
	$$ = symbolGenerator();

@component()
export default class iStaticPage<
	P extends Dictionary = Dictionary,
	Q extends Dictionary = Dictionary,
	M extends Dictionary = Dictionary,
	D extends Dictionary = Dictionary
> extends iPage<D> {
	/**
	 * Link to i18n function
	 */
	@system()
	readonly i18n: typeof i18n = i18n;

	/** @override */
	@system(() => globalEvent)
	readonly globalEvent!: Event<this>;

	/**
	 * Authorization status
	 */
	@field((o) => o.remoteState.isAuth)
	isAuth!: boolean;

	/**
	 * Online status
	 */
	@field((o) => o.remoteState.isOnline)
	isOnline!: boolean;

	/**
	 * Last online date
	 */
	@system((o) => o.remoteState.lastOnlineDate)
	lastOnlineDate?: Date;

	/** @override */
	@field({
		atom: true,
		init: () => remoteState
	})

	remoteState!: Dictionary;

	/** @override */
	get route(): CanUndef<CurrentPage<P, Q, M>> {
		return this.getField('routeStore');
	}

	/**
	 * @override
	 * @emits setRoute(value: CanUndef<CurrentPage<P, Q, M>>)
	 */
	set route(value: CanUndef<CurrentPage<P, Q, M>>) {
		this.setField('routeStore', value);
		this.emit('setRoute', value);
	}

	/** @override */
	get pageTitle(): string {
		return <NonNullable<string>>this.getField('pageTitleStore');
	}

	/** @override */
	set pageTitle(value: string) {
		document.title = value;
	}

	/**
	 * System language
	 */
	get lang(): string {
		return <NonNullable<string>>this.getField('langStore');
	}

	/**
	 * Sets a new system language
	 */
	set lang(value: string) {
		this.setField('langStore', value);
		setLang(value);
	}

	/**
	 * Route information object store
	 */
	@field()
	protected routeStore?: CurrentPage<P, Q, M>;

	/**
	 * Root page router instance
	 */
	@system()
	protected routerStore?: bRouter;

	/**
	 * System language store
	 */
	@field()
	protected langStore: string = lang;

	/**
	 * Cache of root modifiers
	 */
	@system()
	protected rootMods: RootMods = {};

	/**
	 * Sets a new page title
	 *
	 * @param value
	 * @param component
	 */
	setPageTitle(value: string, component: ComponentInterface = this): CanPromise<boolean> {
		this.pageTitle = value;
		return this.pageTitle === value;
	}

	/**
	 * Sends a message for reset to all components
	 * @param [type] - reset type
	 */
	reset(type?: ResetType): void {
		this.nextTick(() => reset(type), {
			label: $$.reset
		});
	}

	/** @override */
	// @ts-ignore
	setRootMod(name: string, value: unknown, component: iBlock = this): boolean {
		const
			root = document.documentElement;

		if (value === undefined || !root) {
			return false;
		}

		const
			cl = root.classList;

		const
			c = (component.globalName || component.componentName).dasherize(),
			mod = this.getFullBlockName(c, name, value).replace(/_/g, '-');

		name = `${c}_${name.camelize(false)}`;
		value = String(value).dasherize();

		const
			cache = this.rootMods[name];

		if (cache) {
			if (cache.value === value && cache.component === component) {
				return false;
			}

			cl.remove(cache.mod);
		}

		cl.add(mod);
		this.rootMods[name] = {
			mod,
			value: <string>value,
			component
		};

		return true;
	}

	/** @override */
	// @ts-ignore
	removeRootMod(name: string, value?: unknown, component: iBlock = this): boolean {
		const
			root = document.documentElement;

		if (!root) {
			return false;
		}

		name = `${(component.globalName || component.componentName).dasherize()}_${name.camelize(false)}`;
		value = value !== undefined ? String(value).dasherize() : undefined;

		const
			cache = this.rootMods[name];

		if (cache) {
			if (cache.component !== component) {
				return false;
			}

			if (value === undefined || value === cache.value) {
				root.classList.remove(cache.mod);
				delete this.rootMods[name];
				return true;
			}
		}

		return false;
	}

	/** @override */
	getRootMod(name: string, component: ComponentInterface = this): undefined | string {
		return this.removeRootMod[name] && this.removeRootMod[name].value;
	}

	/**
	 * Synchronization for the langStore field
	 * @param lang
	 */
	@watch('langStore')
	@watch('globalEvent:i18n.setLang')
	protected syncLangWatcher(lang: string): void {
		if (this.lang === lang) {
			return;
		}

		this.lang = lang;
		this.$forceUpdate();
	}

	/**
	 * Synchronization for the isAuth field
	 * @param [e]
	 */
	@watch('globalEvent:session.*')
	protected syncAuthWatcher(e?: SetEvent): void {
		this.isAuth = Boolean(e && e.auth);
	}

	/**
	 * Synchronization for the isOnline field
	 * @param e
	 */
	@watch('globalEvent:net.status')
	protected syncOnlineWatcher(e: StatusEvent): void {
		this.isOnline = e.status;
		this.lastOnlineDate = e.lastOnline;
	}

	/** @override */
	protected initBaseAPI(): void {
		super.initBaseAPI();
		this.remoteState = remoteState;
	}
}
