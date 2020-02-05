/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import bVirtualScroll, { axis } from 'base/b-virtual-scroll/b-virtual-scroll';

export type Axis = keyof typeof axis;

export type RequestQuery<T extends unknown = unknown> = (params: RequestMoreParams<T>) => Dictionary<Dictionary>;
export type RequestFn<T extends unknown = unknown> = (params: RequestMoreParams<T>) => boolean;
export type RequestEngine<T extends unknown = unknown> =
	(query: CanUndef<Dictionary>, ctx: bVirtualScroll) => Promise<T>;

export type RequestParams = CanUndef<Record<string, Dictionary>>;

export interface OptionEl<T extends unknown = unknown> {
	/**
	 * Current render data
	 */
	current: T;

	/**
	 * Previous render data
	 */
	prev: CanUndef<T>;

	/**
	 * Next render data
	 */
	next: CanUndef<T>;
}

export interface RequestMoreParams<T extends unknown = unknown> {
	/**
	 * Number of the last loaded page
	 */
	currentPage: number;

	/**
	 * Number of a page to upload
	 */
	nextPage: number;

	/**
	 * Number of items to show till the page bottom is reached
	 */
	itemsTillBottom: number;

	/**
	 * Items to render
	 */
	items: RenderItem<T>[];

	/**
	 * True if the last requested data response was empty
	 */
	isLastEmpty: boolean;

	/**
	 * Last loaded data chunk
	 */
	lastLoadedData: Array<T>;
}

export interface RemoteData {
	/**
	 * Data to render components
	 */
	data: unknown[];

	/**
	 * Total number of elements
	 */
	total?: number;
}

export interface RenderItem<T extends unknown = unknown> {
	/**
	 * Component data
	 */
	data: T;

	/**
	 * Component DOM node
	 */
	node: CanUndef<HTMLElement>;

	/**
	 * Component destructor
	 */
	destructor: CanUndef<Function>;

	/**
	 * Component position in a DOM tree
	 */
	index: number;
}
