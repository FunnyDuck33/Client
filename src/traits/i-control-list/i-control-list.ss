- namespace [%fileName%]

/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

/**
 * Generates a layout for controls
 *
 * @param {!Object} params - additional parameters:
 *   *) [from] - data store
 *   *) [componentName] - name of the parent component (by default will used link from $parent)
 *   *) [class] - class or classes for control elements
 *
 * @param {string=} [content] - slot content
 */
- @@ignore
- template index(@params, content)
	: classes = {}

	- if Object.isString(@class)
		? classes[@class] = {}

	- else if (Object.isObject(@class))
		? Object.assign(classes, @class)

	: &
		componentName = @component ? (@component|json) : 'false',
		classesJSON = (classes|json)
	.

	< component &
		v-for = el in ${@from} |
		:is = el.component || 'b-button' |
		:instanceOf = bButton |
		:class = ${componentName} ? provide.elClasses(${componentName}, ${classesJSON}) : provide.elClasses(${classesJSON}) |
		:v-attrs = el.attrs
	.
		- if content
			+= content

		- else
			{{ el.text }}
