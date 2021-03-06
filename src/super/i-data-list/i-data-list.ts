/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import $C = require('collection.js');
import iData, { component, CreateRequestOptions } from 'super/i-data/i-data';
import { RequestQuery } from 'core/data';
export * from 'super/i-data/i-data';

export interface DataList<T> {
	data: T[];
	total: number;
}

@component()
export default class iDataList<T extends Dictionary = Dictionary> extends iData<DataList<T>> {
	/** @override */
	get(data?: RequestQuery, params?: CreateRequestOptions<DataList<T>>): Promise<CanUndef<DataList<T>>> {
		return super.get(data, params);
	}

	/** @override */
	protected convertDataToDB<O>(data: unknown): O;
	protected convertDataToDB(data: unknown): DataList<T>;
	protected convertDataToDB<O>(data: unknown): O | DataList<T> {
		const
			v = super.convertDataToDB<O | DataList<T>>(data);

		if (Object.isFrozen(v)) {
			return v;
		}

		const
			obj = Object.create(<object>v);

		Object.assign(obj, Object.select(v, ['data', 'total']));
		obj.data = $C(obj.data).map((el) => this.convertDataChunk(el));

		return obj;
	}

	/**
	 * Converts the specified remote data chunk to the component format and returns it
	 * @param chunk
	 */
	protected convertDataChunk(chunk: unknown): T {
		return <T>chunk;
	}

	/**
	 * Compares two specified elements
	 *
	 * @param el1
	 * @param el2
	 */
	protected compareEls(el1: T, el2: T): boolean {
		return Object.fastCompare(el1, el2);
	}

	/**
	 * Adds the specified data object to the store
	 * @param data
	 */
	protected addData(data: T): {type: 'upd'; upd: Function} {
		return {
			type: 'upd',
			upd: () => {
				if (!this.db) {
					return;
				}

				this.db.total++;
				this.db.data.push(data);
			}
		};
	}

	/**
	 * Updates the specified data object from the store
	 *
	 * @param data
	 * @param i - element index
	 */
	protected updData(data: T, i: number): {type: 'upd' | 'del'; upd: Function; del: Function} {
		return {
			type: 'upd',
			upd: () => {
				if (!this.db) {
					return;
				}

				Object.assign(this.db.data[i], data);
			},

			del: () => {
				if (!this.db) {
					return;
				}

				this.db.total--;
				this.db.data.splice(i, 1);
			}
		};
	}

	/**
	 * Removes the specified data object from the store
	 *
	 * @param data
	 * @param i - element index
	 */
	protected delData(data: T, i: number): {type: 'del'; del: Function} {
		return {
			type: 'del',
			del: () => {
				if (!this.db) {
					return;
				}

				this.db.total--;
				this.db.data.splice(i, 1);
			}
		};
	}

	/** @override */
	protected async onAddData(data: unknown): Promise<void> {
		if (data == null) {
			this.reload().catch(stderr);
			return;
		}

		const list = (<T[]>[]).concat(this.convertDataToDB<T>(data));
		await this.async.wait(() => this.db);

		const
			db = (<DataList<T>>this.db).data;

		for (let i = 0; i < list.length; i++) {
			const
				el1 = list[i];

			let
				some = false;

			if (db) {
				for (let j = 0; j < db.length; j++) {
					if (this.compareEls(el1, db[j])) {
						some = true;
						break;
					}
				}
			}

			if (!some) {
				const
					mut = this.addData(el1);

				if (mut && mut.type && mut[mut.type]) {
					mut[mut.type].call(this);

				} else {
					return this.reload();
				}
			}
		}
	}

	/** @override */
	// @ts-ignore
	protected async onUpdData(data: unknown): Promise<void> {
		const
			db = (<DataList<T>>this.db).data;

		if (data == null || db == null) {
			this.reload().catch(stderr);
			return;
		}

		const list = (<T[]>[]).concat(this.convertDataToDB<T>(data));
		await this.async.wait(() => this.db);

		for (let i = 0; i < list.length; i++) {
			const
				el1 = list[i];

			for (let j = 0; j < db.length; j++) {
				if (this.compareEls(el1, db[j])) {
					const
						mut = this.updData(el1, j);

					if (mut && mut.type && mut[mut.type]) {
						mut[mut.type].call(this);
						break;
					}

					return this.reload();
				}
			}
		}
	}

	/** @override */
	protected async onDelData(data: unknown): Promise<void> {
		const
			db = (<DataList<T>>this.db).data;

		if (data == null || db == null) {
			this.reload().catch(stderr);
			return;
		}

		const list = (<T[]>[]).concat(this.convertDataToDB<T>(data));
		await this.async.wait(() => this.db);

		for (let i = 0; i < list.length; i++) {
			const
				el1 = list[i];

			for (let j = 0; j < db.length; j++) {
				if (this.compareEls(el1, db[j])) {
					const
						mut = this.delData(el1, j);

					if (mut && mut.type && mut[mut.type]) {
						mut[mut.type].call(this);
						break;
					}

					return this.reload();
				}
			}
		}
	}
}
