/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import iBlock from 'super/i-block/i-block';

export default abstract class iIcon {
	/**
	 * Returns
	 *
	 * @param component
	 * @param [pos] - hint position
	 */
	static setHint<T extends iBlock>(component: T, pos: string = 'bottom'): ReadonlyArray<string> {
		return component.provide.blockClasses('g-hint', {pos});
	}

	/**
	 * Sets g-hint for the specified element
	 * @param [pos] - hint position
	 */
	abstract setHint(pos: string): ReadonlyArray<string>;
}