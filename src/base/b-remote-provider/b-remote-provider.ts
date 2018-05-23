/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import Then from 'core/then';
import symbolGenerator from 'core/symbol';
import iData, { component, prop, watch } from 'super/i-data/i-data';
export * from 'super/i-data/i-data';

export const
	$$ = symbolGenerator();

@component()
export default class bRemoteProvider<T extends Dictionary = Dictionary> extends iData<T> {
	/** @override */
	readonly remoteProvider: boolean = true;

	/**
	 * Field for setting to a component parent
	 */
	@prop({type: String, required: false})
	readonly field?: string;

	/**
	 * Synchronization for the db field
	 *
	 * @param [value]
	 * @emits change(db: T)
	 */
	@watch('db')
	protected syncDBWatcher(value: T): void {
		const
			p = this.$parent;

		if (!p) {
			return;
		}

		const handler = () => {
			if (this.field) {
				p.setField(this.field, value);
			}

			this.emit('change', value);
		};

		const res = p.waitStatus('ready', handler, {
			label: $$.syncDBWatcher
		});

		if (Then.isThenable(res)) {
			res.catch(stderr);
		}
	}
}
