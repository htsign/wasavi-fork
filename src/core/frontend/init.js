/**
 * wasavi: vi clone implemented in javascript
 * =============================================================================
 *
 *
 * @author akahuku@gmail.com
 */
/**
 * Copyright 2012-2017 akahuku, akahuku@gmail.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function (g) {

'use strict';

const BRACKETS = '[{(<"\'``\'">)}]';
const CLOSE_BRACKETS = BRACKETS.substring(BRACKETS.length / 2);

const LOG_PROMISE = false;
const LOG_EX = false;
const LOG_MAP_MANAGER = false;
const LOG_LAST_SIMPLE_COMMAND = false;

/** @type {Pick<typeof Wasavi,
 *   'IS_GECKO' | 'BRACKETS' | 'CLOSE_BRACKETS'
 *   | 'LINE_NUMBER_MAX_WIDTH' | 'LINE_NUMBER_RELATIVE_WIDTH'
 *   | 'COMPOSITION_CLASS' | 'LEADING_CLASS' | 'MARK_CLASS' | 'EMPHASIS_CLASS'
 *   | 'CURSOR_SPAN_CLASS' | 'BOUND_CLASS'
 *   | 'MIGEMO_EXTENSION_ID' | 'MIGEMO_GET_REGEXP_STRING'
 *   | 'LOG_PROMISE' | 'LOG_EX' | 'LOG_MAP_MANAGER' | 'LOG_LAST_SIMPLE_COMMAND'>} */
const constants = {
	IS_GECKO: typeof g.browser !== 'undefined'
		&& typeof g.browser.runtime !== 'undefined'
		// Chrome 148+ also defines `browser` as an alias of `chrome`,
		// so check the extension origin scheme to identify Firefox
		&& g.browser.runtime.getURL('').startsWith('moz-extension://'),

	BRACKETS,
	CLOSE_BRACKETS,

	LINE_NUMBER_MAX_WIDTH: 6,
	LINE_NUMBER_RELATIVE_WIDTH: 2,

	COMPOSITION_CLASS: 'wasavi_composition',
	LEADING_CLASS: 'wasavi_leading',
	MARK_CLASS: 'wasavi_mark',
	EMPHASIS_CLASS: 'wasavi_em',
	CURSOR_SPAN_CLASS: 'wasavi_command_cursor_span',
	BOUND_CLASS: 'wasavi_bound',

	MIGEMO_EXTENSION_ID: 'dfccgbheolnlopfmahkcjiefggclmadb',
	MIGEMO_GET_REGEXP_STRING: 'getRegExpString',

	LOG_PROMISE,
	LOG_EX,
	LOG_MAP_MANAGER,
	LOG_LAST_SIMPLE_COMMAND
};

// Wasavi is assembled across files: init.js defines the constants below, while
// each class file appends its own constructor. Lock the constants (non-writable,
// non-enumerable, non-configurable) as `Object.defineProperties` did originally.
g.Wasavi = /** @type {typeof Wasavi} */ ({});
Object.entries(constants).forEach(([key, value]) =>
	Object.defineProperty(g.Wasavi, key, {value}));

})(typeof globalThis == 'object' ? globalThis : window);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
