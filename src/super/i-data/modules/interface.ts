/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import Async, { AsyncOpts } from 'core/async';
import { RemoteEvent } from 'super/i-block/i-block';

//#if runtime has core/data

import {

	Socket,
	RequestQuery,
	RequestBody,
	RequestResponseObject,
	RequestError,
	ModelMethods,
	CreateRequestOpts as BaseCreateRequestOpts

} from 'core/data';

export {

	ModelMethods,
	RequestQuery,
	RequestBody,
	RequestResponseObject,
	RequestError

} from 'core/data';

//#endif

export interface RequestFilterOpts<T = unknown> {
	isEmpty: boolean;
	method: ModelMethods;
	params: CreateRequestOpts<T>;
}

export type RequestFilter<T = unknown> =
	((data: RequestQuery | RequestBody, opts: RequestFilterOpts<T>) => boolean) |
	boolean;

export type DefaultRequest<T = unknown> = [RequestQuery | RequestBody, CreateRequestOpts<T>];
export type Request<T = unknown> = RequestQuery | RequestBody | DefaultRequest<T>;
export type RequestParams<T = unknown> = StrictDictionary<Request<T>>;

export interface SocketEvent<T extends object = Async> extends RemoteEvent<T> {
	connection: Promise<Socket | void>;
}

export interface CreateRequestOpts<T = unknown> extends BaseCreateRequestOpts<T>, AsyncOpts {
	showProgress?: boolean;
	hideProgress?: boolean;
}

export interface ComponentConverter<T = unknown> {
	(value: unknown): T;
}
