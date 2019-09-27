/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import MutationObserverStrategy from 'core/component/directives/in-view/mutation';
import IntersectionObserverStrategy from 'core/component/directives/in-view/intersection';

import {

	InitOptions,
	ObservableElement,
	ObservableThresholdMap

} from 'core/component/directives/in-view/interface';

import { valueValidator } from 'core/component/directives/in-view/helpers';

export type ObserveStrategy =
	IntersectionObserverStrategy |
	MutationObserverStrategy;

export default class InViewAdapter {
	/**
	 * Observer adaptee
	 */
	protected adaptee?: ObserveStrategy;

	/**
	 * True if an adapter instance has an adaptee
	 */
	get hasAdaptee(): boolean {
		return this.adaptee !== undefined;
	}

	/**
	 * Sets an adaptee
	 * @param instance
	 */
	setInstance(instance: ObserveStrategy): void {
		this.adaptee = instance;
	}

	/**
	 * Returns true if an adaptee type is 'mutation'
	 * @param adaptee
	 */
	isMutation(adaptee: ObserveStrategy): adaptee is MutationObserverStrategy {
		return adaptee.type === 'mutation';
	}

	/**
	 * Returns true if an adaptee type is 'observer'
	 * @param adaptee
	 */
	isIntersection(adaptee: ObserveStrategy): adaptee is IntersectionObserverStrategy {
		return adaptee.type === 'observer';
	}

	/**
	 * Starts observing the specified element
	 *
	 * @param el
	 * @param params
	 */
	observe(el: HTMLElement, params: CanArray<InitOptions>): false | void {
		if (!this.adaptee) {
			return false;
		}

		params = (<InitOptions[]>[]).concat(params);

		for (let i = 0; i < params.length; i++) {
			if (valueValidator(params[i])) {
				this.adaptee.observe(el, params[i]);
			}
		}
	}

	/**
	 * Activates deactivated elements by the specified group
	 * @param [group]
	 */
	activate(group?: string): void {
		if (!this.adaptee) {
			return;
		}

		return this.adaptee.setGroupState(false, group);
	}

	/**
	 * Deactivates elements by the specified group
	 * @param [group]
	 */
	deactivate(group?: string): void {
		if (!this.adaptee) {
			return;
		}

		return this.adaptee.setGroupState(true, group);
	}

	/**
	 * Removes an element from observable elements
	 * @param el
	 */
	remove(el: HTMLElement): boolean {
		if (!this.adaptee) {
			return false;
		}

		return this.adaptee.remove(el);
	}

	/**
	 * Stops observing the specified element
	 * @param el
	 */
	stopObserve(el: HTMLElement): boolean {
		if (!this.adaptee) {
			return false;
		}

		return this.adaptee.stopObserve(el);
	}

	/**
	 * Checks if elements is in view
	 */
	check(): void {
		if (!this.adaptee || this.isIntersection(this.adaptee)) {
			return;
		}

		this.adaptee.check();
	}

	/**
	 * Recalculates the elements position map
	 * @param deffer
	 */
	recalculate(deffer: boolean): void {
		if (!this.adaptee || this.isIntersection(this.adaptee)) {
			return;
		}

		if (deffer) {
			return this.adaptee.recalculateDeffer();
		}

		this.adaptee.recalculate();
	}

	/**
	 * Calls an observable callback
	 * @param observable
	 */
	call(observable: ObservableElement): void {
		if (!this.adaptee) {
			return;
		}

		this.adaptee.call(observable);
	}

	/**
	 * Returns a threshold map of the specified element
	 * @param el
	 */
	getThresholdMap(el: HTMLElement): CanUndef<ObservableThresholdMap> {
		if (!this.adaptee) {
			return;
		}

		return this.adaptee.getThresholdMap(el);
	}

	/**
	 * Returns an observable element
	 *
	 * @param el
	 * @param threshold
	 */
	get(el: HTMLElement, threshold: number): CanUndef<ObservableElement> {
		if (!this.adaptee) {
			return;
		}

		return this.adaptee.getEl(el, threshold);
	}

	/**
	 * Normalizes the specified directive options
	 * @param opts
	 */
	protected normalizeOptions(opts: InitOptions): InitOptions {
		return opts;
	}
}