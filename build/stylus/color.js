'use strict';

/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

const
	$C = require('collection.js'),
	stylus = require('stylus'),
	pzlr = require('@pzlr/build-core');

const
	GLOBAL_COLORS = {
		kits: {},
		space: {}
	},
	PROJECT_NAME = pzlr.config.projectName;

/**
 * Saves HEXs to the global space with its kit names
 *
 * @param {!Array} colors
 * @param {!string} name
 */
function saveToSpace(colors, name) {
	$C(colors).forEach((el) => {
		GLOBAL_COLORS.space[el] = name;
	});
}

/**
 * Throws an error if a color
 * already exists in the global space
 *
 * @param {!RGBA} hex
 * @returns {RGBA}
 */
function checkInGlobalSpace(hex) {
	const
		color = hex.raw || hex.string || hex.name;

	if (GLOBAL_COLORS.space[color]) {
		throw new Error(`Identical HEX '${hex}' was found at the kit with name '${GLOBAL_COLORS.space[color]}'`);
	}

	return hex;
}

/**
 * Converts stylus nodes collection to a js array
 *
 * @param {!Object} nodes
 * @param {string} name
 * @returns {string[]}
 */
function kitFromNodes(nodes, name) {
	const
		str = nodes.toString().replace(/[ ()]/g, ''),
		values = str.split(',');

	saveToSpace(values, name);
	return values;
}

/**
 * Saves subset of colors to a global color sets variable
 *
 * @param {!Object} kit - subset
 * @param {string} nm - name of a subset
 * @param {boolean} [theme] - is subset a theme
 */
function saveColorsKit(kit, nm, theme) {
	const reduce = (s, r = {}) => $C(s).reduce((res, el, name) => {
		if (el.nodes) {
			if (theme) {
				if (res[name]) {
					res[name][0] = kitFromNodes(el.nodes, name);

				} else {
					res[name] = [].concat([kitFromNodes(el.nodes, name)]);
				}

			} else {
				res[name] = [].concat([[]], kitFromNodes(el.nodes, name));
			}
		}

		return res;
	}, r);

	if (nm === PROJECT_NAME) {
		GLOBAL_COLORS.kits = reduce(kit, GLOBAL_COLORS.kits);

	} else {
		GLOBAL_COLORS.kits[nm] = reduce(kit, GLOBAL_COLORS.kits[nm]);
	}
}

/**
 * Picks an rgba color from the specified hex string
 *
 * @param {string} str - hex value
 * @param {Object=} [meta] - additional info
 * @returns {string}
 */
function pickColor(str, meta = {}) {
	try {
		return new stylus.Parser(str).peek().val;

	} catch (_) {
		throw new Error(`Can't find a color with the hex value ${str}. Additional info ${JSON.stringify(meta)}`);
	}
}

module.exports = function (style) {
	/**
	 * Registers a kit with specified name
	 *
	 * @param {!Object} kit
	 * @param {string} name
	 * @param {boolean=} theme
	 */
	style.define('registerColors', (kit, name, theme = false) => {
		if (!name || !kit) {
			throw new Error('Can\'t register colors kit');
		}

		saveColorsKit(kit.vals, name.val, theme && theme.val);
	});

	/**
	 * Returns a global color value
	 *
	 * @param {!Object} hueInput - color
	 * @param {!Object} numInput - color position in a kit
	 * @param {(!Object|boolean)} reservedInput - is value in reserved kit
	 * @param (!Object|boolean) baseInput - proto field name
	 * @returns {string}
	 */
	style.define('getGlobalColor', (hueInput, numInput, reservedInput = false, baseInput = false) => {
		if (arguments.length === 1 && hueInput.raw) {
			return checkInGlobalSpace(hueInput);
		}

		const
			{dependencies} = pzlr.config,
			hue = hueInput.string || hueInput.name,
			num = numInput.string || numInput.val,
			reserved = reservedInput && reservedInput.val || false,
			base = baseInput && baseInput.val || false,
			meta = {hue, num, reserved, base};

		let
			col = GLOBAL_COLORS.kits[hue],
			res;

		if (!base) {
			if (col && (reserved && col[0][num - 1] || col[num])) {
				return reserved ? pickColor(col[0][num - 1], meta) : pickColor(col[num], meta);
			}

			$C(dependencies).some((el) => {
				col = GLOBAL_COLORS.kits[el];

				if (col) {
					const
						val = $C(col).get(`${hue}.0.${num - 1}`);

					if (reserved && val) {
						res = val;
						return true;

					} else if (!reserved && $C(col).get(`${hue}.${num}`)) {
						res = col[hue][num];
						return true;
					}
				}
			});

		} else {
			const
				kit = GLOBAL_COLORS.kits[base];

			if (kit && reserved) {
				res = kit[hue][0][num - 1];

			} else if (kit && kit[hue] && kit[hue][num]) {
				res = kit[hue][num];
			}
		}

		return pickColor(res, meta);
	});
};
