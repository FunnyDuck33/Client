/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import symbolGenerator from 'core/symbol';
import iData, { component, prop, field, system, hook, watch, p } from 'super/i-data/i-data';
export * from 'super/i-data/i-data';

export const
	$$ = symbolGenerator();

export interface Option {
	label: string;
	value?: unknown;
	href?: string;
	info?: string;
	theme?: string;
	active?: boolean;
	hidden?: boolean;
	progress?: boolean;
	hint?: string;
	preIcon?: string;
	preIconHint?: string;
	preIconComponent?: string;
	icon?: string;
	iconHint?: string;
	iconComponent?: string;
}

@component({
	functional: {
		dataProvider: undefined
	},

	model: {
		prop: 'valueProp',
		event: 'onChange'
	}
})

export default class bList<T extends Dictionary = Dictionary> extends iData<T> {
	/**
	 * Initial component value
	 */
	@prop(Array)
	readonly valueProp: Option[] = [];

	/**
	 * Initial component active value
	 */
	@prop({required: false})
	readonly activeProp?: any | any[];

	/**
	 * If true, then will be generated href value for a link if it's not existed
	 */
	@prop(Boolean)
	readonly autoHref: boolean = false;

	/**
	 * If true, then all list labels won't be shown
	 */
	@prop(Boolean)
	readonly hideLabels: boolean = false;

	/**
	 * If true, then will be enabled multiple value mode
	 */
	@prop(Boolean)
	readonly multiple: boolean = false;

	/**
	 * If true, then tab activation can be cancel (with multiple = false)
	 */
	@prop(Boolean)
	readonly cancelable: boolean = false;

	/**
	 * If true, then will be shown page load status on transitions
	 */
	@prop(Boolean)
	readonly showProgress: boolean = false;

	/**
	 * Component value
	 */
	@field({
		watch: (o) => {
			const ctx: bList = <any>o;
			ctx.initComponentValues();
		},

		init: (o) => o.link((val) => {
			const ctx: bList = <any>o;
			return ctx.dataProvider ? ctx.value || [] : ctx.normalizeOptions(val);
		})
	})

	value!: Option[];

	/**
	 * Component active value
	 */
	@p({cache: false})
	get active(): unknown {
		const v = this.getField('activeStore');
		return this.multiple ? Object.keys(<object>v) : v;
	}

	/**
	 * Temporary index table
	 */
	@system()
	protected indexes!: Dictionary;

	/**
	 * Temporary values table
	 */
	@system()
	protected values!: Dictionary<number>;

	/**
	 * Component active value store
	 *
	 * @emits change(active: any)
	 * @emits immediateChange(active: any)
	 */
	@system((o) => o.link((val) => {
		const
			ctx: bList = <any>o,
			beforeDataCreate = o.hook === 'beforeDataCreate';

		if (val === undefined && beforeDataCreate) {
			return ctx.activeStore;
		}

		let
			res;

		if (ctx.multiple) {
			const
				objVal = Object.fromArray([].concat(val || []));

			if (Object.fastCompare(objVal, ctx.activeStore)) {
				return ctx.activeStore;
			}

			res = objVal;

		} else {
			res = val;
		}

		if (!beforeDataCreate) {
			ctx.emit('change', res);
		}

		ctx.emit('immediateChange', res);
		return res;
	}))

	protected activeStore!: any;

	/**
	 * Returns link to the active element
	 */
	@p({cache: true})
	protected get activeElement(): CanPromise<HTMLAnchorElement | null> {
		return this.waitStatus<HTMLAnchorElement | null>('ready', () => {
			if (this.active in this.values) {
				return this.block.element('link', {
					id: this.values[this.active]
				});
			}

			return null;
		});
	}

	/**
	 * Toggles the specified value
	 *
	 * @param value
	 * @emits change(active: any)
	 */
	toggleActive(value: any): boolean {
		const
			a = this.getField('activeStore');

		if (this.multiple) {
			if (value in a) {
				return this.removeActive(value);
			}

			return this.setActive(value);
		}

		if (a !== value) {
			return this.setActive(value);
		}

		return this.removeActive(value);
	}

	/**
	 * Activates the specified value
	 *
	 * @param value
	 * @emits change(active: any)
	 * @emits immediateChange(active: any)
	 */
	setActive(value: any): boolean {
		const
			a = this.getField('activeStore');

		if (this.multiple) {
			if (value in a) {
				return false;
			}

			this.setField(`activeStore.${value}`, true);

		} else if (a === value) {
			return false;

		} else {
			this.setField('activeStore', value);
		}

		const
			{block: $b} = this;

		if ($b) {
			const
				target = $b.element('link', {id: this.values[value]});

			if (!this.multiple) {
				const
					old = $b.element('link', {active: true});

				if (old && old !== target) {
					$b.setElMod(old, 'link', 'active', false);
				}
			}

			if (target) {
				$b.setElMod(target, 'link', 'active', true);
			}
		}

		this.emit('change', this.active);
		this.emit('immediateChange', this.active);
		return true;
	}

	/**
	 * Deactivates the specified value
	 *
	 * @param value
	 * @emits change(active: any)
	 * @emits immediateChange(active: any)
	 */
	removeActive(value: any): boolean {
		const
			a = this.getField('activeStore'),
			cantCancel = !this.cancelable;

		if (this.multiple) {
			if (!(value in a) || cantCancel) {
				return false;
			}

			this.deleteField(`activeField.${value}`);

		} else if (a !== value || cantCancel) {
			return false;

		} else {
			this.setField('activeStore', undefined);
		}

		const
			{block: $b} = this;

		if ($b) {
			const
				target = $b.element('link', {id: this.values[value]});

			if (target) {
				$b.setElMod(target, 'link', 'active', false);
			}
		}

		this.emit('change', this.active);
		this.emit('immediateChange', this.active);
		return true;
	}

	/** @override */
	protected initRemoteData(): Option[] | undefined {
		if (!this.db) {
			return;
		}

		const
			val = this.convertDBToComponent<Option[]>(this.db);

		if (Object.isArray(val)) {
			return this.value = this.normalizeOptions(val);
		}

		return this.value;
	}

	/** @override */
	protected initBaseAPI(): void {
		super.initBaseAPI();

		const
			i = this.instance;

		this.isActive = i.isActive.bind(this);
		this.setActive = i.setActive.bind(this);
		this.normalizeOptions = i.normalizeOptions.bind(this);
	}

	/**
	 * Returns true if the specified option is active
	 * @param option
	 */
	protected isActive(option: Option): boolean {
		const v = this.getField('activeStore');
		return this.multiple ? String(option.value) in v : option.value === v;
	}

	/**
	 * Normalizes the specified options and returns it
	 * @param options
	 */
	protected normalizeOptions(options: Option[] | undefined): Option[] {
		return $C(options).map((el) => {
			if (el.value === undefined) {
				el.value = el.href;
			}

			if (el.href === undefined) {
				el.href = this.autoHref && el.value !== undefined ? `#${el.value}` : 'javascript:void(0)';
			}

			return el;
		});
	}

	/**
	 * Initializes component values
	 */
	@hook('beforeDataCreate')
	protected initComponentValues(): void {
		const
			values = {},
			indexes = {},
			a = this.getField('activeStore');

		$C(this.$$data.value).forEach((el, i) => {
			const
				val = el.value;

			if (el.active && (this.multiple ? !(val in a) : a === undefined)) {
				this.setActive(val);
			}

			values[val] = i;
			indexes[i] = val;
		});

		this.values = values;
		this.indexes = indexes;
	}

	/** @override */
	protected onAddData(data: any): void {
		Object.assign(this.db, this.convertDataToDB(data));
	}

	/** @override */
	protected onUpdData(data: any): void {
		Object.assign(this.db, this.convertDataToDB(data));
	}

	/** @override */
	protected onDelData(data: any): void {
		Object.assign(this.db, this.convertDataToDB(data));
	}

	/**
	 * Handler: tab change
	 *
	 * @param e
	 * @emits actionChange(active: any)
	 */
	@watch({field: '?$el:click', wrapper: (o, cb) => o.delegateElement('link', cb)})
	protected onActive(e: Event): void {
		const
			target = <Element>e.delegateTarget,
			id = Number(this.block.getElMod(target, 'link', 'id'));

		this.toggleActive(this.indexes[id]);
		this.emit('actionChange', this.active);
	}
}
