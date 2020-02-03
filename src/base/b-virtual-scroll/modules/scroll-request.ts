/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import bVirtualScroll from 'base/b-virtual-scroll/b-virtual-scroll';
import ScrollRender from 'base/b-virtual-scroll/modules/scroll-render';

import { getRequestParams } from 'base/b-virtual-scroll/modules/helpers';
import { RemoteData, RequestMoreParams } from 'base/b-virtual-scroll/modules/interface';

export default class ScrollRequest {
	/**
	 * Current page
	 */
	page: number = 1;

	/**
	 * Total amount of elements being loaded
	 */
	total: number = 0;

	/**
	 * All loaded data
	 */
	data: unknown[] = [];

	/**
	 * Last loaded data
	 */
	lastLoadedData: unknown[] = [];

	/**
	 * True if all requests for additional data was requested
	 */
	isDone: boolean = false;

	/**
	 * True if the last request returned an empty array or undefined
	 */
	isLastEmpty: boolean = false;

	/**
	 * Component instance
	 */
	protected component: bVirtualScroll['unsafe'];

	/**
	 * API for scroll rendering
	 */
	protected get scrollRender(): ScrollRender {
		// @ts-ignore (access)
		return this.component.scrollRender;
	}

	/**
	 * @param component - component instance
	 */
	constructor(component: bVirtualScroll) {
		this.component = component.unsafe;
	}

	/**
	 * Resets the current state
	 */
	reset(): void {
		this.total = 0;
		this.page = 1;
		this.data = [];
		this.isDone = false;
		this.isLastEmpty = false;
		this.component.removeMod('requestsDone', true);
	}

	/**
	 * Reloads the last request
	 */
	reloadLast(): void {
		this.isDone = false;
		this.isLastEmpty = false;
		this.component.removeMod('requestsDone', true);
	}

	/**
	 * Tries to request additional data
	 */
	try(): Promise<void> {
		const
			{component, scrollRender} = this;

		const additionParams = {
			lastLoadedData: this.lastLoadedData.length === 0 ? component.options : this.lastLoadedData
		};

		const
			resolved = Promise.resolve(),
			shouldRequest = component.shouldMakeRequest(getRequestParams(this, scrollRender, additionParams));

		const cantRequest = () =>
			this.isDone ||
			!shouldRequest ||
			!component.dataProvider ||
			component.mods.progress === 'true';

		if (cantRequest()) {
			return resolved;
		}

		scrollRender.setRefVisibility('tombstones', true);

		return this.load()
			.then((v) => {
				scrollRender.setRefVisibility('tombstones', false);

				if (!component.field.get('data.length', v)) {
					this.isLastEmpty = true;
					this.checksRequestPossibility(getRequestParams(this, scrollRender, {lastLoaded: []}));
					return;
				}

				const
					{data} = <RemoteData>v;

				this.page++;
				this.isLastEmpty = false;
				this.data = this.data.concat(data);
				this.lastLoadedData = data;

				scrollRender.initItems(data);
				scrollRender.render();

			}).catch(stderr);
	}

	/**
	 * Checks possibility of another request for data
	 * @param params
	 */
	checksRequestPossibility(params: RequestMoreParams): boolean {
		const {component, scrollRender} = this;
		this.isDone = !component.shouldContinueRequest(params);

		if (this.isDone) {
			// @ts-ignore (access)
			scrollRender.onRequestsDone();

		} else {
			component.removeMod('requestsDone', true);
		}

		return !this.isDone;
	}

	/**
	 * Loads additional data
	 */
	protected load(): Promise<CanUndef<RemoteData>> {
		const
			{component} = this;

		// @ts-ignore (access)
		const params = <CanUndef<Dictionary>>(component.getDefaultRequestParams('get') || [])[0];
		Object.assign(params, component.requestQuery?.(getRequestParams(this, this.scrollRender))?.get);

		return component.get(params)
			.then((data) => {
				if (!data) {
					this.lastLoadedData = [];
					return;
				}

				const
					// @ts-ignore (access)
					converted = component.convertDataToDB<CanUndef<RemoteData>>(data);

				if (!converted?.data?.length) {
					this.lastLoadedData = [];
					return;
				}

				return converted;
			})

			.catch((err) => {
				stderr(err);
				this.lastLoadedData = [];
				return undefined;
			});
	}
}
