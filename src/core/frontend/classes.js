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

const Wasavi = g.Wasavi;

Wasavi.Position = class {
	/**
	 * @param {number} row
	 * @param {number} col
	 */
	constructor(row, col) {
		this.row = row;
		this.col = col;
	}
	/** @returns {string} */
	toString() {
		return '[object Position(' + this.row + ',' + this.col + ')]';
	}
	/** @returns {WasaviPosition} */
	clone() {
		return new Wasavi.Position(this.row, this.col);
	}
	/**
	 * @param {WasaviEditor} t
	 * @returns {this}
	 */
	round(t) {
		this.row = minmax(0, this.row, t.rowLength - 1);
		this.col = minmax(0, this.col, t.rows(this.row).length - (this.row == t.rowLength - 1 ? 0 : 1));
		return this;
	}
	/**
	 * @param {unknown} o
	 * @returns {o is WasaviPositionLike}
	 */
	isp(o) {
		return o instanceof Wasavi.Position ||
			typeof o == 'object' && o != null &&
			'row' in o && 'col' in o &&
			typeof o.row == 'number' && typeof o.col == 'number';
	}
	/**
	 * @param {WasaviPositionLike} o
	 * @returns {boolean}
	 */
	eq(o) {
		return this.isp(o) && this.row == o.row && this.col == o.col;
	}
	/**
	 * @param {WasaviPositionLike} o
	 * @returns {boolean}
	 */
	ne(o) {
		return this.isp(o) && (this.row != o.row || this.col != o.col);
	}
	/**
	 * @param {WasaviPositionLike} o
	 * @returns {boolean}
	 */
	gt(o) {
		return this.isp(o) && (this.row > o.row || this.row == o.row && this.col > o.col);
	}
	/**
	 * @param {WasaviPositionLike} o
	 * @returns {boolean}
	 */
	lt(o) {
		return this.isp(o) && (this.row < o.row || this.row == o.row && this.col < o.col);
	}
	/**
	 * @param {WasaviPositionLike} o
	 * @returns {boolean}
	 */
	ge(o) {
		return this.isp(o) && (this.row > o.row || this.row == o.row && this.col >= o.col);
	}
	/**
	 * @param {WasaviPositionLike} o
	 * @returns {boolean}
	 */
	le(o) {
		return this.isp(o) && (this.row < o.row || this.row == o.row && this.col <= o.col);
	}
};

Wasavi.L10n = class {
	/** @type {WasaviApp} */
	#app;
	/** @type {WasaviMessageCatalog | undefined} */
	#catalog;
	/** @type {{ name: string, value: string }[]} */
	#pluralFunctions = [];

	/**
	 * @param {WasaviApp} app
	 * @param {WasaviMessageCatalog} [catalog]
	 */
	constructor(app, catalog) {
		this.#app = app;
		this.#catalog = catalog;
		this.#init();
	}

	/**
	 * @param {string} m
	 * @returns {string}
	 */
	#getId(m) {
		return m.toLowerCase()
			.replace(/\{(\d+)\}/g, '@$1')
			.replace(/\{(\w+):\d+\}/g, '$1')
			.replace(/[^A-Za-z0-9_@ ]/g, '')
			.replace(/ +/g, '_');
	}

	/**
	 * @param {string} [expr]
	 * @returns {void}
	 */
	#compile(expr) {
		this.#pluralFunctions = [];

		var nodes = (expr || '').split(/\s*,\s*/);
		for (var i = 0, goal = nodes.length; i < goal; i++) {
			var re = /^(\w+)\(([^)]+)\)$/.exec(nodes[i]);
			if (!re) continue;
			this.#pluralFunctions.push({name:re[1], value:re[2]});
		}
	}

	/**
	 * @param {number} n
	 * @returns {string}
	 */
	#getPluralSuffix(n) {
		for (var i = 0, goal = this.#pluralFunctions.length; i < goal; i++) {
			switch (this.#pluralFunctions[i].name) {
			case 'isone':
				if (n == 1) return this.#pluralFunctions[i].value;
				break;
			}
		}
		return '';
	}

	/**
	 * @param {string} word
	 * @param {number} n
	 * @returns {string}
	 */
	#getPluralNoun(word, n) {
		var suffix = this.#getPluralSuffix(n - 0);
		var id = '_plural_' + word + (suffix == '' ? '' : ('@' + suffix));
		if (this.#catalog) {
			return id in this.#catalog ? this.#catalog[id].message : word;
		}
		else if (this.#app.extensionChannel) {
			return this.#app.extensionChannel.getMessage(id) || word;
		}
		return word;
	}

	/**
	 * @param {string} messageId
	 * @returns {string}
	 */
	getMessage(messageId) {
		if (this.#catalog) {
			if (messageId in this.#catalog) {
				return this.#catalog[messageId].message;
			}
			var id = this.#getId(messageId);
			if (id in this.#catalog) {
				this.#catalog[messageId] = this.#catalog[id];
				delete this.#catalog[id];
				return this.#catalog[messageId].message;
			}
		}
		else if (this.#app.extensionChannel) {
			return this.#app.extensionChannel.getMessage(this.#getId(messageId)) || messageId;
		}
		return messageId;
	}

	/**
	 * @returns {(...args: unknown[]) => string}
	 */
	getTranslator() {
		return (...args) => {
			var format = this.getMessage(/** @type {string} */ (args.shift()));
			return format.replace(/\{(?:([a-z]+):)?(\d+)\}/ig, ($0, $1, $2) => {
				return $1 == undefined || $1 == '' ?
					toVisibleString(args[Number($2)]) : this.#getPluralNoun($1, Number(args[Number($2)]));
			});
		};
	}

	/** @returns {void} */
	#init() {
		const PLURAL_FUNCTION_SIGNATURE = '_plural_rule@function';
		var expressionString;

		if (this.#catalog && PLURAL_FUNCTION_SIGNATURE in this.#catalog) {
			expressionString = this.#catalog[PLURAL_FUNCTION_SIGNATURE].message;
		}
		if (!expressionString && this.#app.extensionChannel) {
			expressionString = this.#app.extensionChannel.getMessage(PLURAL_FUNCTION_SIGNATURE);
		}

		this.#compile(expressionString);
	}
};

class VariableItem {
	static #ASSIGN_STATE_INITIAL = /** @type {const} */ (0);
	static #ASSIGN_STATE_WARNED = /** @type {const} */ (1);
	static #ASSIGN_STATE_ERRORED = /** @type {const} */ (2);

	/** @type {WasaviApp} */
	#app;
	/** @type {string} */
	name;
	/** @type {WasaviConfigType} */
	type;
	/** @type {boolean} */
	isLateBind;
	/** @type {boolean} */
	isDynamic;
	/** @type {boolean} */
	isAsync;
	/** @type {unknown} */
	defaultValue;
	/** @type {WasaviConfigSubSetter | null | undefined} */
	subSetter;
	/** @type {unknown} */
	nativeValue;
	/** @type {Record<string, unknown> | undefined} */
	#snapshots = undefined;
	/** @type {0 | 1 | 2} */
	#assignState = VariableItem.#ASSIGN_STATE_INITIAL;

	/**
	 * @param {WasaviApp} app
	 * @param {string} name
	 * @param {WasaviConfigType} type
	 * @param {unknown} defaultValue
	 * @param {WasaviConfigSubSetter | null} [subSetter]
	 * @param {WasaviConfigOptions} [opts]
	 */
	constructor(app, name, type, defaultValue, subSetter, opts) {
		opts || (opts = {});
		this.#app = app;
		this.name = name;
		this.type = type;
		this.isLateBind = type == 'r';
		this.isDynamic = 'isDynamic' in opts ? !!opts.isDynamic : false;
		this.isAsync = 'isAsync' in opts ? !!opts.isAsync : false;
		this.defaultValue = defaultValue;
		this.subSetter = subSetter;
		this.nativeValue = defaultValue;
	}

	/** @returns {unknown} */
	get value() {
		return this.nativeValue;
	}

	/** @returns {string} */
	get visibleString() {
		switch (this.type) {
		case 'b':
			return (this.nativeValue ? '  ' : 'no') + this.name;
		case 'i': case 'I': case 's': case 'r':
			var value = String(this.nativeValue ?? '');
			if (/[\s"']/.test(value)) {
				value = "'" + value.replace(/["']/g, '\\$&') + "'";
			}
			return '  ' + this.name + '=' + value;
		default:
			throw new TypeError('*invalid type for visibleString: ' + this.type + ' *');
		}
	}

	/** @returns {WasaviConfigInfo} */
	getInfo() {
		var that = this;
		return {
			get name() {return that.name},
			get type() {return that.type},
			get isLateBind() {return that.isLateBind},
			get isDynamic() {return that.isDynamic},
			get isAsync() {return that.#assignState ? false : that.isAsync},
			get defaultValue() {return that.defaultValue}
		};
	}

	/**
	 * @param {unknown} v
	 * @returns {unknown}
	 */
	setValue(v) {
		try {
			this.#assignState = VariableItem.#ASSIGN_STATE_INITIAL;

			switch (this.type) {
			case 'b':
				v = Boolean(v);
				if (typeof v != 'boolean') throw new TypeError(_('Invalid boolean value'));
				break;
			case 'i':
				if (typeof v == 'string' && !/^[0-9]+$/.test(v)) {
					throw new TypeError(_('Invalid integer value'));
				}
				v = parseInt(String(v), 10);
				if (typeof v != 'number' || isNaN(v)) {
					throw new TypeError(_('Invalid integer value'));
				}
				break;
			case 'I':
				if (!/^[-+]?[0-9]+$/.test(String(v))) {
					throw new TypeError(_('Invalid integer value'));
				}
				v = parseInt(String(v), 10);
				if (typeof v != 'number' || isNaN(v)) {
					throw new TypeError(_('Invalid integer value'));
				}
				break;
			case 's':
				v = String(v);
				if (typeof v != 'string') throw new TypeError(_('Invalid string value'));
				break;
			case 'r':
				if (typeof v != 'string') throw new TypeError(_('Invalid regex source string value'));
				break;
			default:
				throw new TypeError('*Invalid type for value getter: ' + this.type + ' *');
			}

			if (this.subSetter) {
				v = this.subSetter(v);
				if (v == undefined) {
					this.#assignState = VariableItem.#ASSIGN_STATE_WARNED;
					return v;
				}
			}

			if (v instanceof Promise) {
				return v.then(v => {
					this.nativeValue = v;
					return this;
				});
			}

			return this.nativeValue = v;
		}
		catch (e) {
			this.#assignState = VariableItem.#ASSIGN_STATE_ERRORED;
			throw e;
		}
	}

	/** @returns {() => RegExp | null} */
	getBinder() {
		switch (this.type) {
		case 'r':
			return (v => {
				return () => {
					return this.#app.low.getFindRegex({
						pattern: v.nativeValue,
						csOverride: '',
						globalOverride: '',
						multilineOverride: ''
					});
				}
			})(this);
		default:
			throw new TypeError('*invalid type for getBinder: ' + this.type + ' *');
		}
	}

	/** @returns {void} */
	reset() {
		if (this.isDynamic) return;
		this.nativeValue = this.defaultValue;
	}

	/**
	 * @param {string} name
	 * @returns {void}
	 */
	saveSnapshot(name) {
		if (this.isDynamic) return;

		if (!this.#snapshots) {
			this.#snapshots = {};
		}

		this.#snapshots[name] = this.value;
	}

	/**
	 * @param {string} name
	 * @returns {void}
	 */
	loadSnapshot(name) {
		if (this.isDynamic) return;
		if (!this.#snapshots) return;
		if (!(name in this.#snapshots)) return;

		this.nativeValue = this.#snapshots[name];
	}
}

Wasavi.Configurator = class {
	/** @type {WasaviApp} */
	#app;
	/** @type {VariableItem[]} */
	#internals = [];
	/** @type {Record<string, string>} */
	#abbrevs;
	/** @type {WasaviConfigVars & Record<string, unknown>} */
	#vars;
	/** @type {Record<string, number>} */
	#names = {};

	/**
	 * @param {WasaviApp} app
	 * @param {readonly WasaviConfigInternal[]} internals
	 * @param {Record<string, string>} abbrevs
	 */
	constructor(app, internals, abbrevs) {
		this.#app = app;
		this.#abbrevs = abbrevs;
		this.#vars = /** @type {WasaviConfigVars & Record<string, unknown>} */ ({});
		this.#init(internals);
	}

	/**
	 * @param {readonly WasaviConfigInternal[]} internals
	 * @returns {void}
	 */
	#init(internals) {
		this.#internals = internals.slice().sort(function (a, b) {
			return a[0].localeCompare(b[0]);
		})
		.map(([name, type, defaultValue, subSetter, opts], i) => {
			var v = new VariableItem(this.#app, name, type, defaultValue, subSetter, opts);
			this.#names[v.name] = i;
			if (v.isLateBind) {
				v.setValue(v.nativeValue);
				Object.defineProperty(this.#vars, v.name, {
					get:v.getBinder(),
					configurable:false,
					enumerable:true
				});
			}
			else {
				try {v.setValue(v.nativeValue)} catch (e) {}
				this.#vars[v.name] = v.value;
			}
			return v;
		});
	}

	/**
	 * @param {string} name
	 * @returns {VariableItem | null}
	 */
	#getItem(name) {
		name = name.replace(/^(?:no|inv)/, '');
		if (name in this.#abbrevs) {
			name = this.#abbrevs[name];
		}
		return name in this.#names ? this.#internals[this.#names[name]] : null;
	}

	/**
	 * @param {string} name
	 * @returns {WasaviConfigInfo | null}
	 */
	getInfo(name) {
		var item = this.#getItem(name);
		return item ? item.getInfo() : null;
	}

	/**
	 * @overload
	 * @param {string} name
	 * @param {true} reformat
	 * @returns {string}
	 */
	/**
	 * @overload
	 * @param {string} name
	 * @param {boolean} [reformat]
	 * @returns {unknown}
	 */
	/**
	 * @param {string} name
	 * @param {boolean} [reformat]
	 * @returns {unknown}
	 */
	getData(name, reformat) {
		var item = this.#getItem(name);
		return item ? (reformat ? item.visibleString : item.value) : null;
	}

	/**
	 * @param {string} name
	 * @param {unknown} [value]
	 * @param {boolean} [skipSubSetter]
	 * @returns {unknown}
	 */
	setData(name, value, skipSubSetter) {
		var result;
		var off = false;
		var invert = false;
		if (/^no/.test(name)) {
			name = name.substring(2);
			off = true;
		}
		else if (/^inv/.test(name)) {
			name = name.substring(3);
			invert = off = true;
		}
		var item = this.#getItem(name);
		if (!item) {
			return _('Unknown option: {0}', name);
		}
		if (item.type == 'b') {
			if (value !== undefined) {
				return _('An extra value assigned to {0} option.', item.name);
			}
			if (invert) {
				result = item.setValue(!item.value);
			}
			else {
				result = item.setValue(!off);
			}
		}
		else if (off) {
			return _('{0} option is not a boolean.', item.name);
		}
		else {
			var subSetter;
			if (skipSubSetter) {
				subSetter = item.subSetter;
				item.subSetter = null;
			}

			try {
				result = item.setValue(value);
			}
			catch (e) {
				return e instanceof Error ? e.message : String(e);
			}
			finally {
				if (subSetter) {
					item.subSetter = subSetter;
				}
			}
		}

		if (result instanceof Promise) {
			return result.then(item => {
				return this.#vars[item.name] = item.value;
			});
		}
		else {
			this.#vars[item.name] = item.value;
			return null;
		}
	}

	/**
	 * @param {number} cols
	 * @param {boolean} [all]
	 * @returns {string[]}
	 */
	dump(cols, all) {
		const phaseThreshold = 20;
		const gap = 1;
		var result = [_('*** options ***')];
		for (var i = 0; i < 2; i++) {
			var maxLength = 0;
			/** @type {string[]} */
			var tmp = [];
			for (var j = 0; j < this.#internals.length; j++) {
				var item = this.#internals[j];
				var line = item.visibleString;
				if (!all && item.value == item.defaultValue) continue;
				if (i == 0 && line.length <= phaseThreshold - gap
				||  i == 1 && line.length >  phaseThreshold - gap) {
					tmp.push(line);
					if (line.length > maxLength) {
						maxLength = line.length;
					}
				}
			}
			if (i == 0) {
				var c = Math.max(1, Math.floor((cols + gap - 3) / (maxLength + gap)));
				var r = Math.floor((tmp.length + c - 1) / c);
				for (var j = 0; j < r; j++) {
					var tmpline = '';
					for (var k = 0; k < c; k++) {
						var index = k * r + j;
						if (index < tmp.length) {
							tmpline += tmp[index] +
								multiply(' ', maxLength + gap - tmp[index].length);
						}
					}
					result.push(tmpline);
				}
			}
			else {
				tmp.length && result.push(' ');
				for (var j = 0; j < tmp.length; j++) {
					result.push(toVisibleString(tmp[j]));
				}
			}
		}
		return result;
	}

	/** @returns {string} */
	dumpData() {
		/** @type {string[]} */
		var index = [];
		/** @type {string[]} */
		var content = [];
		var ab = reverseObject(this.#abbrevs);
		index.push('** version: ' + this.#app.version + '**', '', '');
		for (var i = 0, goal = this.#internals.length; i < goal; i++) {
			var v = this.#internals[i];
			index.push('* <a href="#wasavi-option-' + v.name + '">' + v.name + '</a>');
			content.push('<a href="#" name="wasavi-option-' + v.name + '">#</a> ' + v.name);
			content.push('--------');
			content.push('');
			switch (v.type) {
			case 'b': content.push('* type: boolean'); break;
			case 'i': content.push('* type: integer (greater or equals to 0)'); break;
			case 'I': content.push('* type: natural number'); break;
			case 's': content.push('* type: string'); break;
			case 'r': content.push('* type: string (regal expression)'); break;
			}
			content.push('* default value: `' + v.defaultValue + '`');
			v.name in ab && content.push('* abbreviation: `' + ab[v.name] + '`');
			content.push('');
		}
		index.push('');
		return index.concat(content).join('\n');
	}

	/**
	 * @param {boolean} [modifiedOnly]
	 * @returns {string[]}
	 */
	dumpScript(modifiedOnly) {
		/** @type {string[]} */
		var result = [];
		for (var i = 0, goal = this.#internals.length; i < goal; i++) {
			var v = this.#internals[i];
			if (modifiedOnly && v.value == v.defaultValue) continue;
			if (v.isDynamic) continue;
			result.push('set ' + v.visibleString);
		}
		return result;
	}

	/**
	 * @param {string} [name]
	 * @returns {void}
	 */
	reset(name) {
		if (name == undefined) {
			for (var i = 0, goal = this.#internals.length; i < goal; i++) {
				this.#internals[i].reset();
			}
		}
		else {
			var item = this.#getItem(name);
			item && item.reset();
		}
	}

	/**
	 * @param {string} snapshot
	 * @returns {void}
	 */
	saveSnapshot(snapshot) {
		for (var i = 0, goal = this.#internals.length; i < goal; i++) {
			this.#internals[i].saveSnapshot(snapshot);
		}
	}

	/**
	 * @param {string} snapshot
	 * @param {string} [name]
	 * @returns {void}
	 */
	loadSnapshot(snapshot, name) {
		if (name == undefined) {
			for (var i = 0, goal = this.#internals.length; i < goal; i++) {
				this.#internals[i].loadSnapshot(snapshot);
			}
		}
		else {
			var item = this.#getItem(name);
			item && item.loadSnapshot(snapshot);
		}
	}

	/** @returns {WasaviConfigVars} */
	get vars() {
		return this.#vars;
	}

	/** @returns {Record<string, string>} */
	get abbrevs() {
		return this.#abbrevs;
	}
};

Wasavi.RegexConverter = class RegexConverter {
	static #SPECIAL_SPACE = /** @type {const} */ ('[\u0009\u000b\u000c\u0020\u00a0\u2000-\u200b\u2028\u2029\u3000]');
	static #SPECIAL_NONSPACE = /** @type {const} */ ('[\u0000-\u0008\u000a\u000d-\u001f\u0021-\u009f\u00a1-\u1fff\u200c-\u2027\u202a-\u2fff\u3001-\uffff]');
	/** @type {{ backslashed: Record<string, string[]>, nonbackslashed: Record<string, string[]>, common: Record<string, string[]> }} */
	static #META_MAP = {
		backslashed:{
			// index 0: vi regex -> js regex mapping (outside of character class)
			// index 1: vi regex -> invalidated vi regex mapping
			// index 2: vi regex -> vi regex mapping (inside of character class)
			'\\\\': ['\\\\', '\\\\\\\\'],
			'\\<': ['\\b', '\\\\<', ''],	// TODO: this map is INCORRECT.
			'\\>': ['\\b', '\\\\>', ''],	// TODO: this map is INCORRECT.
			'\\{': ['{', '\\\\{'],
			'\\}': ['}', '\\\\}'],
			'\\(': ['(', '\\\\('],
			'\\)': [')', '\\\\)'],
			'\\?': ['?', '\\\\?'],
			'\\+': ['+', '\\\\+'],
			'\\|': ['|', '\\\\|'],
			'\\s': [this.#SPECIAL_SPACE, '\\\\s', this.#SPECIAL_SPACE.replace(/^\[|\]$/g, '')],
			'\\S': [this.#SPECIAL_NONSPACE, '\\\\S', this.#SPECIAL_NONSPACE.replace(/^\[|\]$/g, '')]
		},

		nonbackslashed:{
			'{': ['\\{', '{'],
			'}': ['\\}', '}'],
			'(': ['\\(', '('],
			')': ['\\)', ')'],
			'?': ['\\?', '?'],
			'+': ['\\+', '+'],
			'|': ['\\|', '|']
		},

		common:{
			'.': ['.', '\\.'],
			'*': ['*', '\\*'],
			'[': ['[', '\\['],
			']': [']', '\\]'],
			'^': ['^', '\\^'],
			'$': ['$', '\\$']
		}
	};

	/** @type {WasaviApp} */
	#app;

	/** @param {WasaviApp} app */
	constructor(app) {
		this.#app = app;
	}

	/**
	 * @param {string} s
	 * @param {boolean} [forceLiteral]
	 * @returns {string}
	 */
	#parse(s, forceLiteral) {
		/** @type {string[]} */
		var result = [];
		var isInClass = false;
		var index = forceLiteral ? 1 : 0;
		for (var i = 0, goal = s.length; i < goal; i++) {
			var ch = s.charAt(i);
			if (ch == '\\') {
				if (++i >= goal) {
					throw new SyntaxError('a backslash cannot be end');
				}
			}
			if (isInClass) {
				if (ch == '\\') {
					ch += s.charAt(i);
					result.push(RegexConverter.#META_MAP.backslashed[ch][2] || ch);
				}
				else if (ch == ']') {
					result.push(ch);
					isInClass = false;
				}
				else {
					result.push(ch);
				}
			}
			else {
				if (ch == '\\') {
					ch += s.charAt(i);
					if (ch in RegexConverter.#META_MAP.backslashed) {
						if (ch == '\\?' && result.at(-1) == '(') {
							result.push(RegexConverter.#META_MAP.backslashed[ch][1]);
						}
						else {
							result.push(RegexConverter.#META_MAP.backslashed[ch][index]);
						}
					}
					else {
						if (forceLiteral) {
							result.push(ch.replace(/\\/g, '\\\\'));
						}
						else {
							result.push(ch);
						}
					}
				}
				else if (ch in RegexConverter.#META_MAP.nonbackslashed) {
					result.push(RegexConverter.#META_MAP.nonbackslashed[ch][index]);
				}
				else if (ch in RegexConverter.#META_MAP.common) {
					result.push(RegexConverter.#META_MAP.common[ch][index]);
					if (ch == '[' && !forceLiteral) {
						isInClass = true;
					}
				}
				else {
					result.push(ch);
				}
			}
		}
		if (isInClass) {
			throw new SyntaxError('unclosed character class');
		}
		return result.join('');
	}

	/**
	 * @param {string} s
	 * @returns {string}
	 */
	fixup(s) {
		return s.replace(/\\s/g, RegexConverter.#SPECIAL_SPACE);
	}

	/**
	 * @param {string | RegExp} s
	 * @returns {string}
	 */
	toJsRegexString(s) {
		if (typeof s == 'string') {
			return this.#parse(s);
		}
		else if (s instanceof RegExp) {
			return s.source;
		}
		throw new SyntaxError('invalid regex source');
	}

	/**
	 * @param {string} s
	 * @returns {string}
	 */
	toLiteralString(s) {
		return this.#parse(s, true);
	}

	/**
	 * @param {string | RegExp} s
	 * @param {string} [opts]
	 * @returns {RegExp | null}
	 */
	toJsRegex(s, opts) {
		/** @type {RegExp | null} */
		var result;
		try {
			result = new RegExp(this.toJsRegexString(s), opts ?? '');
		}
		catch (e) {
			result = null;
		}
		return result;
	}

	/**
	 * @param {string} s
	 * @returns {string}
	 */
	getCS(s) {
		if (this.#app.config.vars.smartcase && /[A-Z]/.test(s)) {
			return 'i';
		}
		return this.#app.config.vars.ignorecase ? 'i' : '';
	}

	/** @returns {{ wrapscan: boolean }} */
	getDefaultOption() {
		return {
			wrapscan: this.#app.config.vars.wrapscan
		};
	}

	/** @returns {string} */
	get SPECIAL_SPACE() {
		return RegexConverter.#SPECIAL_SPACE;
	}

	/** @returns {string} */
	get SPECIAL_NONSPACE() {
		return RegexConverter.#SPECIAL_NONSPACE;
	}
};

Wasavi.PrefixInput = class {
	/** @type {string} */
	#register = '';
	/** @type {string} */
	#operation = '';
	/** @type {string} */
	#motion = '';
	/** @type {string} */
	#count1 = '';
	/** @type {string} */
	#count2 = '';
	/** @type {string} */
	#trailer = '';
	/** @type {boolean} */
	#isEmpty = true;

	/** @type {boolean} */
	isLocked = false;

	/**
	 * @param {string | WasaviPrefixInputInit} [init]
	 */
	constructor(init) {
		this.#init(init);
	}

	/**
	 * @param {string | WasaviPrefixInputInit} [arg]
	 * @returns {void}
	 */
	#init(arg) {
		if (typeof arg == 'string') {
			this.#register = '';
			this.#operation = '';
			this.#motion = '';
			this.#count1 = '';
			this.#count2 = '';
			this.#trailer = '';
			this.#isEmpty = true;
			this.isLocked = false;

			do {
				var re = /^("(?:=[^\n]*|.))?([1-9][0-9]*)?(g?.)([1-9][0-9]*)?(g?.)(.*)$/.exec(arg);
				if (re) {
					if (typeof re[1] == 'string' && re[1] != '') {
						this.#register = re[1];
					}
					if (typeof re[2] == 'string' && re[2] != '') {
						this.#count1 = re[2];
					}
					if (typeof re[3] == 'string' && re[3] != '') {
						this.#operation = re[3];
					}
					if (typeof re[4] == 'string' && re[4] != '') {
						this.#count2 = re[4];
					}
					if (typeof re[5] == 'string' && re[5] != '') {
						this.#motion = re[5];
					}
					if (typeof re[6] == 'string' && re[6] != '') {
						this.#trailer = re[6];
					}
					break;
				}

				var re = /^("(?:=[^\n]*|.))?([1-9][0-9]*)?(g?.)(.*)$/.exec(arg);
				if (re) {
					if (typeof re[1] == 'string' && re[1] != '') {
						this.#register = re[1];
					}
					if (typeof re[2] == 'string' && re[2] != '') {
						this.#count2 = re[2];
					}
					if (typeof re[3] == 'string' && re[3] != '') {
						this.#motion = re[3];
					}
					if (typeof re[4] == 'string' && re[4] != '') {
						this.#trailer = re[4];
					}
					break;
				}

				throw new TypeError('PrefixInput: invalid initializer: ' + arg);

			} while (false);
		}
		else {
			var opts = arg || {};
			this.#register = opts.register || '';
			this.#operation = opts.operation || '';
			this.#motion = opts.motion || '';
			this.#count1 = String(opts.count1 || '');
			this.#count2 = String(opts.count2 || '');
			this.#trailer = opts.trailer || '';
			this.#isEmpty = !!opts.isEmpty || true;
			this.isLocked = !!opts.isLocked || false;
		}
	}

	/**
	 * @param {(keyof WasaviPrefixInputInit)[]} keys
	 * @returns {void}
	 */
	reset(...keys) {
		if (this.isLocked) return;

		/** @type {Record<keyof WasaviPrefixInputInit, number>} */
		var list = {
			register:0,
			operation:0,
			motion:0,
			count1:0,
			count2:0,
			trailer:0,
			isEmpty:0,
			isLocked:0
		};

		if (keys.length) {
			keys.forEach(key => (key in list) && list[key]++);
		}
		else {
			for (var a in list) {list[/** @type {keyof WasaviPrefixInputInit} */ (a)]++;}
		}

		list['register']  && (this.#register = '');
		list['operation'] && (this.#operation = '');
		list['motion']    && (this.#motion = '');
		list['count1']    && (this.#count1 = '');
		list['count2']    && (this.#count2 = '');
		list['trailer']   && (this.#trailer = '');
		list['isEmpty']   && (this.#isEmpty = true);
		list['isLocked']  && (this.isLocked = false);
	}

	/** @returns {WasaviPrefixInput} */
	clone() {
		return new Wasavi.PrefixInput({
			register:this.#register,
			operation:this.#operation,
			motion:this.#motion,
			count1:this.#count1,
			count2:this.#count2,
			trailer:this.#trailer,
			isEmpty:this.#isEmpty,
			isLocked:this.isLocked
		});
	}

	/**
	 * @param {WasaviPrefixInput | WasaviPrefixInputInit} pi
	 * @returns {void}
	 */
	assign(pi) {
		this.#init({
			register:pi.register,
			operation:pi.operation,
			motion:pi.motion,
			count1:pi.count1,
			count2:pi.count2,
			trailer:pi.trailer,
			isEmpty:pi.isEmpty,
			isLocked:pi.isLocked
		});
	}

	/** @returns {string} */
	toString() {
		return this.#register + this.#count1 + this.#operation + this.#count2 + this.#motion + this.#trailer;
	}

	/** @returns {string} */
	toVisibleString() {
		return [this.#register, this.#count1, this.#operation, this.#count2, this.#motion, this.#trailer]
			.map(function (s) {return window.toVisibleString(s);})
			.join('');
	}

	/**
	 * @param {string} v
	 * @returns {void}
	 */
	appendRegister(v) {
		if (this.isLocked || v == '') return;
		this.#register += v;
		this.#isEmpty = false;
	}

	/**
	 * @param {string} v
	 * @returns {void}
	 */
	appendOperation(v) {
		if (this.isLocked || v == '') return;
		this.#operation += v;
		this.#isEmpty = false;
	}

	/**
	 * @param {string} v
	 * @returns {void}
	 */
	appendMotion(v) {
		if (this.isLocked || v == '') return;
		this.#motion += v;
		this.#isEmpty = false;
	}

	/**
	 * @param {string} v
	 * @returns {void}
	 */
	appendTrailer(v) {
		if (this.isLocked || v == '') return;
		this.#trailer += v;
		this.#isEmpty = false;
	}

	/**
	 * @param {string | number} v
	 * @returns {void}
	 */
	appendCount(v) {
		if (this.isLocked || v == '') return;
		var sv = v + '';
		if (this.#operation == '') {
			if (this.#count1 == '' && !/^[1-9]$/.test(sv)) return;
			if (this.#count1 != '' && !/^[0-9]$/.test(sv)) return;
			this.#count1 += sv;
		}
		else {
			if (!/^[0-9]$/.test(sv)) return;
			this.#count2 += sv;
		}
		this.#isEmpty = false;
	}

	/** @returns {string} */
	get register() {return this.#register.substring(1) || ''}
	/**
	 * @param {string} v
	 */
	set register(v) {
		if (this.isLocked || v == '' || this.#register != '') return;
		this.#register = v;
		this.#isEmpty = false;
	}

	/** @returns {string} */
	get operation() {return this.#operation}
	/**
	 * @param {string} v
	 */
	set operation(v) {
		if (this.isLocked || v == '' || this.#operation != '') return;
		this.#operation = v;
		this.#isEmpty = false;
	}

	/** @returns {string} */
	get motion() {return this.#motion}
	/**
	 * @param {string} v
	 */
	set motion(v) {
		if (this.isLocked || v == '' || this.#motion != '') return;
		this.#motion = v;
		this.#isEmpty = false;
	}

	/** @returns {string} */
	get trailer() {return this.#trailer}
	/**
	 * @param {string} v
	 */
	set trailer(v) {
		if (this.isLocked || v == '' || this.#trailer != '') return;
		this.#trailer = v;
		this.#isEmpty = false;
	}

	/** @returns {string | number} */
	get count1() {return this.#count1 || 0}
	/** @returns {string | number} */
	get count2() {return this.#count2 || 0}
	/** @returns {number} */
	get count() {return (Number(this.#count1) || 1) * (Number(this.#count2) || 1)}
	/** @returns {boolean} */
	get isEmpty() {return this.#isEmpty}
	/** @returns {boolean} */
	get isEmptyOperation() {return this.#operation == ''}
	/** @returns {boolean} */
	get isCountSpecified() {return !!(this.#count1 || this.#count2)}
};

Wasavi.RegexFinderInfo = class {
	/** @type {string} */
	#head = '';
	/** @type {number} */
	#direction = 0;
	/** @type {number} */
	#offset = 0;
	/** @type {number} */
	#scrollTop = 0;
	/** @type {number} */
	#scrollLeft = 0;
	/** @type {string} */
	#pattern = '';
	/** @type {string | false} */
	#updateBound = false;

	/** @type {number | undefined} */
	verticalOffset;
	/** @type {string | null | undefined} */
	text;
	/** @type {WasaviRegexFinderInternalRegex | undefined} */
	internalRegex;

	/**
	 * @param {string} s
	 * @param {string} delimiter
	 * @returns {{ pattern: string, offset: number | undefined }}
	 */
	#parseFindString(s, delimiter) {
		/** @type {{ pattern: string, offset: number | undefined }} */
		let result = {
			pattern: s,
			offset: undefined
		};
		let regex = /\\.|[\S\s]/g;
		let re;
		while ((re = regex.exec(s))) {
			if (re[0] == delimiter) {
				result.pattern = s.substring(0, re.index);

				let trailer = /^\s*([+\-]?)(\d*)/.exec(s.substring(re.index + re[0].length));
				if (trailer && (trailer[1] != '' || trailer[2] != '')) {
					if (trailer[2] == '') {
						trailer[2] = '1';
					}
					result.offset = parseInt(trailer[1] + trailer[2], 10);
				}

				break;
			}
		}
		return result;
	}

	/**
	 * @param {WasaviRegexFinderPushArg} o
	 * @returns {void}
	 */
	push(o) {
		this.#head = o.head || '';
		this.#direction = o.direction || 0;
		this.#offset = o.offset || 0;
		this.#scrollTop = o.scrollTop || 0;
		this.#scrollLeft = o.scrollLeft || 0;
		this.#updateBound = o.updateBound || false;
		this.internalRegex = undefined;
	}

	/**
	 * @param {string} p
	 * @param {boolean} [withOffset]
	 * @returns {void}
	 */
	setPattern(p, withOffset) {
		this.#pattern = p;
		this.verticalOffset = undefined;

		if (withOffset) {
			let parsed = this.#parseFindString(p, this.#head);
			this.#pattern = parsed.pattern;
			this.verticalOffset = parsed.offset;
		}
	}

	/** @returns {string} */
	get head() {return this.#head}
	/** @returns {number} */
	get direction() {return this.#direction}
	/** @returns {number} */
	get offset() {return this.#offset}
	/** @returns {number} */
	get scrollTop() {return this.#scrollTop}
	/** @returns {number} */
	get scrollLeft() {return this.#scrollLeft}
	/** @returns {string} */
	get pattern() {return this.#pattern}
	/** @returns {string | false} */
	get updateBound() {return this.#updateBound}
};

Wasavi.LineInputHistories = class LineInputHistories {
	static #STORAGE_KEY = /** @type {const} */ ('wasavi_lineinput_histories');

	/** @type {WasaviApp} */
	#app;
	/** @type {number} */
	#maxSize;
	/** @type {readonly string[]} */
	#names;
	/** @type {Record<string, WasaviLineInputHistoryEntry>} */
	#s = {};
	/** @type {string} */
	#name = '';
	#isLatest = false;

	/**
	 * @param {WasaviApp} app
	 * @param {number} maxSize
	 * @param {readonly string[]} names
	 * @param {unknown} [value]
	 */
	constructor(app, maxSize, names, value) {
		this.#app = app;
		this.#maxSize = maxSize;
		this.#names = names;
		this.load(value);
	}

	/** @returns {{ s: Record<string, WasaviLineInputHistoryEntry> }} */
	#serialize() {
		return {s:this.#s};
	}

	/**
	 * @param {unknown} src
	 * @returns {void}
	 */
	#restore(src) {
		if (!isObject(src)) return;

		/** @type {Record<string, WasaviLineInputHistoryEntry>} */
		var tmp = {};
		if (isObject(src.s)) {
			var root = src.s;
			for (var na in root) {
				var entry = root[na];
				if (!isObject(entry)) continue;
				if (!isArray(entry.lines)) continue;
				if (!isNumber(entry.current)) continue;

				var lines = entry.lines.filter(isString).slice(-this.#maxSize);
				tmp[na] = {
					lines: lines,
					current: minmax(-1, Math.floor(entry.current), lines.length - 1)
				};
			}
		}
		this.#s = extend(this.#s, tmp);
	}

	/** @returns {void} */
	save() {
		this.#app.low.setLocalStorage(LineInputHistories.#STORAGE_KEY, this.#serialize());
		this.#isLatest = true;
	}

	/**
	 * @param {unknown} [value]
	 * @returns {void}
	 */
	load(value) {
		if (this.#isLatest) {
			this.#isLatest = false;
			return;
		}

		this.#s = {};
		this.#names.forEach(na => {this.#s[na] = {lines:[], current:-1}});
		this.#restore(value || '');
	}

	/**
	 * @param {string} [line]
	 * @returns {void}
	 */
	push(line) {
		line || (line = '');
		if (line != '') {
			var entry = this.#s[this.#name];
			entry.lines = entry.lines.filter(s => s != line);
			entry.lines.push(line);
			while (entry.lines.length > this.#maxSize) {
				entry.lines.shift();
			}
			entry.current = entry.lines.length - 1;
			this.save();
		}
	}

	/** @returns {string | null} */
	prev() {
		var entry = this.#s[this.#name];
		if (entry.current > 0) {
			return entry.lines[--entry.current];
		}
		return null;
	}

	/** @returns {string | null} */
	next() {
		var entry = this.#s[this.#name];
		if (entry.current < entry.lines.length) {
			++entry.current;
			if (entry.current < entry.lines.length) {
				return entry.lines[entry.current];
			}
		}
		return null;
	}

	/** @returns {boolean} */
	get isInitial() {
		var entry = this.#s[this.#name];
		return entry.current == entry.lines.length;
	}
	set isInitial(v) {
		var entry = this.#s[this.#name];
		entry.current = entry.lines.length;
	}

	/** @returns {string} */
	get defaultName() {return this.#name}
	set defaultName(v) {
		if (v in this.#s) {
			this.#name = v;
			this.#s[this.#name].current = this.#s[this.#name].lines.length;
		}
		else {
			throw new TypeError('LineInputHistories: unregistered name: ' + this.#name);
		}
	}

	/** @returns {string} */
	get storageKey() {return LineInputHistories.#STORAGE_KEY}
};

class MapGroup {
	/** @type {WasaviApp} */
	#app;
	/** @type {string} */
	name;
	/** @type {Record<string, string>} */
	rules = {};
	/** @type {Record<string, WasaviKeySequenceItem[]>} */
	sequences = {};
	/** @type {Record<string, WasaviKeySequenceItem[]>} */
	sequencesExpanded = {};
	/** @type {Record<string, {remap: boolean}>} */
	options = {};

	/**
	 * @param {WasaviApp} app
	 * @param {string} name
	 */
	constructor(app, name) {
		this.#app = app;
		this.name = name;
	}

	/** @returns {number} */
	get length() {
		return Object.keys(this.rules).length;
	}

	/**
	 * @param {string} lhs
	 * @param {string} rhs
	 * @param {boolean} remap
	 * @returns {void}
	 */
	register(lhs, rhs, remap) {
		this.rules[lhs] = rhs;
		this.sequences[lhs] = this.#app.keyManager.createSequences(lhs);
		this.sequencesExpanded[lhs] = this.#app.keyManager.createSequences(rhs);
		this.options[lhs] = {remap: !!remap};
	}

	/**
	 * @param {...string} args
	 * @returns {void}
	 */
	remove(...args) {
		for (let i = 0; i < args.length; i++) {
			let lhs = args[i];
			delete this.rules[lhs];
			delete this.sequences[lhs];
			delete this.sequencesExpanded[lhs];
			delete this.options[lhs];
		}
	}

	/** @returns {void} */
	removeAll() {
		for (let lhs in this.rules) {
			this.remove(lhs);
		}
	}

	/**
	 * @param {string} lhs
	 * @returns {boolean}
	 */
	isMapped(lhs) {
		return lhs in this.rules;
	}

	/** @returns {{lhs: string, rhs: string, options: {remap: boolean}}[]} */
	toArray() {
		let result = [];
		for (let lhs in this.rules) {
			result.push({
				lhs: lhs,
				rhs: this.rules[lhs],
				options: this.options[lhs]
			});
		}
		return result;
	}
}

/**
 * @typedef {object} WasaviMapWaitingInfo
 * @property {string} mapType
 * @property {string} lhs
 * @property {number} index
 * @property {number | undefined} timer
 */

/**
 * @typedef {object} WasaviMapExpandOptions
 * @property {boolean} remap
 * @property {string} [overrideMap]
 * @property {WasaviKeySequenceItem} [extraEvent]
 * @property {string} [extraOverrideMap]
 */

Wasavi.MapManager = class MapManager {
	static #RECURSE_MAX = /** @type {const} */ (100);
	static #WAIT_TIMEOUT_MSECS = /** @type {const} */ (1000);

	/** @type {WasaviApp} */
	#app;
	/** @type {Record<string, MapGroup>} */
	#maps;
	/** @type {Record<string, string>} */
	#modeToTypeTable = {
		command:    'normal',

		bound:      'bound',
		bound_line: 'bound',

		insert:     'input',
		overwrite:  'input'
	};

	/** @type {string | undefined} */
	#currentMapType = undefined;
	/** @type {Record<string, WasaviKeySequenceItem[]> | undefined} */
	#currentSequence = undefined;
	#currentIndex = 0;
	/** @type {WasaviMapWaitingInfo | undefined} */
	#waitingMapInfo = undefined;
	#recurseDepth = 0;

	/** @type {WasaviMapManagerOptions['onexpand']} */
	onexpand;
	/** @type {WasaviMapManagerOptions['onrecursemax']} */
	onrecursemax;

	/**
	 * @param {WasaviApp} app
	 * @param {WasaviMapManagerOptions} [opts]
	 */
	constructor(app, opts) {
		this.#app = app;
		this.#maps = {
			normal: new MapGroup(app, 'NORMAL'),
			bound:  new MapGroup(app, 'BOUND'),
			input:  new MapGroup(app, 'INPUT')
		};

		opts || (opts = {});
		this.onexpand = opts.onexpand;
		this.onrecursemax = opts.onrecursemax;
	}

	/**
	 * @param {readonly WasaviKeySequenceItem[]} items
	 * @returns {void}
	 */
	markExpanded(items) {
		for (var i = 0, goal = items.length; i < goal; i++) {
			items[i].mapExpanded =
			items[i].isCompositioned = true;
		}
		items[0].isCompositionedFirst = true;
		items[items.length - 1].isCompositionedLast = true;
	}

	/**
	 * @param {readonly WasaviKeySequenceItem[]} items
	 * @returns {void}
	 */
	markExpandedNoremap(items) {
		for (var i = 0, goal = items.length; i < goal; i++) {
			items[i].isNoremap =
			items[i].mapExpanded =
			items[i].isCompositioned = true;
		}
		items[0].isCompositionedFirst = true;
		items[items.length - 1].isCompositionedLast = true;
	}

	/** @returns {void} */
	#resetMapping() {
		this.#currentMapType = this.#currentSequence = undefined;
		this.#currentIndex = this.#recurseDepth = 0;
		this.#waitingMapInfo = undefined;
	}

	/**
	 * @param {readonly WasaviKeySequenceItem[]} sequencesExpanded
	 * @param {WasaviMapExpandOptions} expandOptions
	 * @returns {void}
	 */
	#expand(sequencesExpanded, expandOptions) {
		this.#resetMapping();

		if (this.#recurseDepth < MapManager.#RECURSE_MAX) {
			this.#recurseDepth++;
			if (!this.onexpand) return;

			let remap = this.#app.config.vars.remap && expandOptions.remap;
			let sequences = sequencesExpanded.map(seq => {
				seq = seq.clone();
				if (expandOptions.overrideMap) {
					seq.overrideMap = expandOptions.overrideMap;
				}

				if (remap) {
					seq.mapExpanded = seq.isCompositioned = true;
				}
				else {
					seq.isNoremap = seq.mapExpanded = seq.isCompositioned = true;
				}

				return seq;
			});

			sequences[0].isCompositionedFirst = true;
			sequences[sequences.length - 1].isCompositionedLast = true;

			if (expandOptions.extraEvent) {
				let seq = expandOptions.extraEvent.clone();

				if (!remap) {
					seq.isNoremap = true;
				}

				if (expandOptions.extraOverrideMap) {
					seq.overrideMap = expandOptions.extraOverrideMap;
				}

				sequences.push(seq);
			}

			this.onexpand(sequences);
		}
		else {
			this.onrecursemax && this.onrecursemax();
		}
	}

	/**
	 * @param {string} mode
	 * @param {WasaviKeySequenceItem} e
	 * @returns {Promise<WasaviKeySequenceItem | undefined>}
	 */
	process(mode, e) {
		return new Promise(resolve => {
			if (!e || !('code' in e)) {
				throw new Error('MapManager: invalid keyboard event argument');
			}

			let mapType = e.overrideMap || this.#modeToTypeTable[mode];

			if (this.#waitingMapInfo) {
				clearTimeout(this.#waitingMapInfo.timer);
				this.#waitingMapInfo.timer = undefined;
			}

			if (this.#waitingMapInfo && mapType && mapType != this.#currentMapType) {
				let wmapType = this.#waitingMapInfo.mapType;
				let wlhs = this.#waitingMapInfo.lhs;
				this.#expand(
					this.#maps[wmapType].sequencesExpanded[wlhs],
					{
						extraEvent: e,
						overrideMap: this.#waitingMapInfo.mapType,
						extraOverrideMap: mapType,
						remap: this.#maps[wmapType].options[wlhs].remap
					});

				resolve(undefined);
				return;
			}

			this.#currentMapType = mapType;

			/** @type {Record<string, WasaviKeySequenceItem[]>} */
			let dst = {};
			/** @type {string | undefined} */
			let fullMatchedLhs;
			let foundCount = 0;

			/*
			 * filter the matching sequence from current map
			 */

			if (mapType) {
				let code = e.code;
				let src = this.#currentSequence || this.#maps[mapType].sequences;

				for (let lhs in src) {
					let sequence = src[lhs];
					if (this.#currentIndex < sequence.length && sequence[this.#currentIndex].code == code) {
						dst[lhs] = src[lhs];
						foundCount++;

						/*
						 * save that matched the whole sequence
						 */

						if (this.#currentIndex == sequence.length - 1) {
							fullMatchedLhs = lhs;
						}
					}
				}
			}

			/*
			 * is there a matched sequence?
			 */

			if (foundCount) {
				this.#currentSequence = dst;
				this.#currentIndex++;

				if (fullMatchedLhs != undefined) {
					// unique match
					if (foundCount == 1) {
						/*
						 * example
						 *
						 * input:
						 *   a
						 *
						 * initial map:
						 *   lhs    rhs
						 *   ---    ---
						 *   a      gg
						 *   b      B
						 *   bb     ^
						 *
						 * filtered map:
						 *   lhs    rhs
						 *   ---    ---
						 *   a      gg   * fullMatchedLhs
						 */

						this.#expand(
							this.#maps[mapType].sequencesExpanded[fullMatchedLhs],
							{
								overrideMap: this.#currentMapType,
								remap: this.#maps[mapType].options[fullMatchedLhs].remap
							});
					}

					// full matched but ambiguous
					else {
						/*
						 * example
						 *
						 * input:
						 *   b
						 *
						 * initial map:
						 *   lhs    rhs
						 *   ---    ---
						 *   a      gg
						 *   b      B
						 *   bb     ^
						 *
						 * filtered map:
						 *   lhs    rhs
						 *   ---    ---
						 *   b      B    * fullMatchedLhs
						 *   bb     ^
						 */

						this.#waitingMapInfo = {
							mapType: mapType,
							lhs: fullMatchedLhs,
							index: this.#currentIndex,
							timer: setTimeout(() => {
								if (!this.#waitingMapInfo) return;
								let mapType = this.#waitingMapInfo.mapType;
								let lhs = this.#waitingMapInfo.lhs;
								this.#expand(
									this.#maps[mapType].sequencesExpanded[lhs],
									{
										remap: this.#maps[mapType].options[lhs].remap
									});
							}, MapManager.#WAIT_TIMEOUT_MSECS)
						};
					}
				}
				else {
					/*
					 * example
					 *
					 * input:
					 *   b
					 *
					 * initial map:
					 *   lhs    rhs
					 *   ---    ---
					 *   a      gg
					 *   bb     B
					 *   bbb    ^
					 *
					 * filtered map:
					 *   lhs    rhs
					 *   ---    ---
					 *   bb     B
					 *   bbb    ^
					 *
					 */

					this.#waitingMapInfo = {
						mapType: mapType,
						lhs: Object.keys(this.#currentSequence)[0].substring(0, this.#currentIndex),
						index: this.#currentIndex,
						timer: setTimeout(() => {
							if (!this.#waitingMapInfo) return;
							let lhs = this.#waitingMapInfo.lhs;
							this.#expand(
								this.#app.keyManager.createSequences(lhs),
								{
									remap: false
								});
						}, MapManager.#WAIT_TIMEOUT_MSECS)
					};
				}

				resolve(undefined);
			}

			/*
			 * no matched sequences
			 */

			else {
				if (this.#waitingMapInfo) {
					let wmapType = this.#waitingMapInfo.mapType;
					let wlhs = this.#waitingMapInfo.lhs;
					let sequences = this.#currentSequence && wlhs in this.#currentSequence ?
						this.#maps[wmapType].sequencesExpanded[wlhs] :
						this.#app.keyManager.createSequences(wlhs);
					this.#expand(
						sequences,
						{
							extraEvent: e,
							overrideMap: wmapType,
							extraOverrideMap: mapType,
							remap: false
						});

					resolve(undefined);
				}
				else {
					resolve(e);
				}
			}
		});
	}

	/** @returns {Record<string, MapGroup>} */
	get maps() {return this.#maps}

	/** @returns {boolean} */
	get isWaiting() {return this.#currentSequence != undefined}
};

class RegisterItem {
	/** @type {boolean} */
	isLineOrient = false;
	/** @type {boolean} */
	locked = false;
	/** @type {string} */
	data = '';

	/**
	 * @param {unknown} data
	 * @param {boolean} [isLineOrient]
	 * @returns {void}
	 */
	set(data, isLineOrient) {
		if (isLineOrient != undefined) {
			this.isLineOrient = isLineOrient;
		}
		this.setData(data);
	}

	/**
	 * @param {unknown} data
	 * @returns {void}
	 */
	setData(data) {
		if (this.locked) return;
		var s = (data || '').toString();
		if (this.isLineOrient) {
			this.data = s.replace(/\n$/, '') + '\n';
		}
		else {
			this.data = s;
		}
	}

	/**
	 * @param {unknown} data
	 * @returns {void}
	 */
	appendData(data) {
		if (this.locked) return;
		var s = (data || '').toString();
		if (this.isLineOrient) {
			this.data += s.replace(/\n$/, '') + '\n';
		}
		else {
			this.data += s;
		}
	}
}

/*
 * available registers:
 *
 * - unnamed register
 *  "       equiv to the last used register's content [vim compatible]
 *
 * - named register
 *  1 - 9   implicit register, and its histories. 1 is latest.
 *  a - z   general named register
 *  A - Z   write: general named register for append
 *          read: special purpose content,
 *  @       last executed command via :@ in ex mode or @ in vi mode
 *  .       last edited text (read only) [vim compatible]
 *  :       last executed ex command (read only) [vim compatible]
 *  *       system clipboard, if available [vim compatible]
 *  +       system clipboard, if available [vim compatible]
 *  /       last searched text (read only) [vim compatible]
 *  ^       last input position (read only) [vim compatible]
 *  =       last computed result of simple math-expression (readonly) [vim compatible]
 *  ;       wasavi uses internally
 */
Wasavi.Registers = class Registers {
	static #STORAGE_KEY = /** @type {const} */ ('wasavi_registers');
	static #WRITABLE_REGEX = /^[1-9a-zA-Z@]$/;
	static #READABLE_REGEX = /^["1-9a-zA-Z@.:*+\/\^=;]$/;

	/** @type {WasaviApp} */
	#app;
	/** @type {RegisterItem} */
	#unnamed = new RegisterItem();
	/** @type {Record<string, RegisterItem | undefined>} */
	#named = {};
	#isLatest = false;

	/**
	 * @param {WasaviApp} app
	 * @param {unknown} [value]
	 */
	constructor(app, value) {
		this.#app = app;
		this.load(value);
	}

	#serialize() {
		return {unnamed:this.#unnamed, named:this.#named};
	}

	/**
	 * @param {unknown} src
	 * @returns {void}
	 */
	#restore(src) {
		if (!isObject(src)) return;
		if (!isObject(src.unnamed)) return;
		if (!isObject(src.named)) return;
		var named = src.named;

		/**
		 * @param {string} k
		 * @param {unknown} v
		 * @returns {void}
		 */
		const doRestore = (k, v) => {
			if (!this.isReadable(k)) return;
			if (!isObject(v)) return;
			if (!isBoolean(v.isLineOrient)) return;
			if (!isString(v.data)) return;

			this.#findItem(k).set(v.data, v.isLineOrient);
		};

		doRestore('"', src.unnamed);
		for (var i in named) {
			doRestore(i, named[i]);
		}
	}

	/** @returns {void} */
	save() {
		this.#app.low.setLocalStorage(Registers.#STORAGE_KEY, this.#serialize());
		this.#isLatest = true;
	}

	/**
	 * @param {unknown} [value]
	 * @returns {void}
	 */
	load(value) {
		if (this.#isLatest) {
			this.#isLatest = false;
			return;
		}

		this.#unnamed = new RegisterItem();
		this.#named = {};
		this.#restore(value || '');
	}

	/**
	 * @param {string} name
	 * @returns {boolean}
	 */
	isWritable(name) {
		return Registers.#WRITABLE_REGEX.test(name.charAt(0));
	}

	/**
	 * @param {string} name
	 * @returns {boolean}
	 */
	isReadable(name) {
		return Registers.#READABLE_REGEX.test(name.charAt(0));
	}

	/**
	 * @param {string} name
	 * @returns {boolean}
	 */
	isClipboard(name) {
		return '*+'.indexOf(name) >= 0;
	}

	/**
	 * @param {string} name
	 * @returns {string}
	 */
	#resolveAlias(name) {
		if (name == '+') {
			name = '*';
		}
		return name;
	}

	/**
	 * @param {string} name
	 * @returns {boolean}
	 */
	exists(name) {
		name = this.#resolveAlias(name.charAt(0));
		if (!this.isReadable(name)) {
			return false;
		}
		if (/^[A-Z"]$/.test(name)) {
			return true;
		}
		return !!this.#named[name];
	}

	/**
	 * @param {string} name
	 * @returns {RegisterItem}
	 */
	#findItem(name) {
		name = this.#resolveAlias(name.charAt(0));
		if (name == '"') {
			return this.#unnamed;
		}
		return this.#named[name] ??= new RegisterItem();
	}

	/**
	 * @param {string} name
	 * @param {unknown} data
	 * @param {boolean} [isLineOrient]
	 * @param {boolean} [isInteractive]
	 * @returns {void}
	 */
	set(name, data, isLineOrient, isInteractive) {
		if (data == '') return;

		name = this.#resolveAlias(name);

		// unnamed register
		if (typeof name != 'string' || name == '') {
			// case of several deletion operation or data of two or more lines,
			// update "1 too.
			if (this.#app.state == 'normal') {
				if (this.#app.prefixInput.operation == 'd' && '%`/?()Nn{}'.indexOf(this.#app.prefixInput.motion) >= 0
				||  (String(data ?? '').match(/\n/g) || []).length >= 2) {
					this.set('1', data, isLineOrient);
				}
			}
			this.#unnamed.set(data, isLineOrient);
		}
		// named register
		else {
			if (name == '1') {
				for (var i = 9; i > 1; i--) {
					this.#named[i] = this.#named[i - 1];
				}
				this.#named['1'] = undefined;
				this.#findItem(name).set(data, isLineOrient);
				this.#unnamed.set(data, isLineOrient);
			}
			else if (/^[2-9a-z*]$/.test(name)) {
				var item = this.#findItem(name);
				item.set(data, isLineOrient);
				this.#unnamed.set(data, isLineOrient);
				name == '*' && this.#app.extensionChannel.setClipboard(item.data);
			}
			else if (/^[@.:\/\^]$/.test(name) && !isInteractive) {
				var item = this.#findItem(name);
				item.set(data, isLineOrient);
			}
			else if (/^[A-Z]$/.test(name)) {
				name = name.toLowerCase();
				this.#findItem(name).appendData(data);
				var lower = this.#named[name];
				lower && this.#unnamed.set(lower.data, lower.isLineOrient);
			}
		}
		this.save();
	}

	/**
	 * @param {string} name
	 * @returns {RegisterItem}
	 */
	get(name) {
		if (typeof name != 'string' || name == '') {
			return this.#unnamed;
		}
		name = this.#resolveAlias(name.charAt(0));
		if (this.isReadable(name)) {
			var item;

			if (/^[A-Z]$/.test(name)) {
				item = new RegisterItem();

				switch (name) {
				case 'B':
					item.set(window.navigator.userAgent);
					break;
				case 'C':
					this.#app.devMode && item.set(this.#app.config.dumpData());
					break;
				case 'D':
					item.set(strftime(this.#app.config.vars.datetime));
					break;
				case 'T':
					item.set(this.#app.targetElement?.title);
					break;
				case 'U':
					item.set(this.#app.targetElement?.url);
					break;
				case 'W':
					item.set('wasavi/' + this.#app.version);
					break;
				}
			}
			else {
				item = this.#findItem(name);
			}

			return item;
		}
		return new RegisterItem();
	}

	/** @returns {string[]} */
	dump() {
		/**
		 * @param {RegisterItem} item
		 * @returns {string}
		 */
		const dumpItem = item => {
			const MAX_LENGTH = 32;
			var orientString = item.isLineOrient ? 'L' : 'C';
			var data = item.data;
			if (data.length > MAX_LENGTH) {
				data = data.substring(0, MAX_LENGTH) + '...';
			}
			return _('  {0}  {1}', orientString, toVisibleString(data));
		};
		var a = [];
		a.push('""' + dumpItem(this.#unnamed));
		for (var i in this.#named) {
			var item = this.#named[i];
			item && a.push('"' + i + dumpItem(item));
		}
		a.sort();
		a.unshift(_('*** registers ***'));
		return a;
	}

	/** @returns {{ isLineOrient: boolean, name: string, data: string }[]} */
	dumpData() {
		/**
		 * @param {string} name
		 * @param {RegisterItem} item
		 * @returns {{ isLineOrient: boolean, name: string, data: string }}
		 */
		const dumpItem = (name, item) => ({
			isLineOrient:item.isLineOrient,
			name:name,
			data:toNativeControl(item.data)
		});
		var a = [];
		a.push(dumpItem('"', this.#unnamed));
		for (var i in this.#named) {
			var item = this.#named[i];
			item && a.push(dumpItem(i, item));
		}
		a.sort((a, b) => a.name.localeCompare(b.name));
		return a;
	}

	/** @returns {string} */
	get storageKey() {return Registers.#STORAGE_KEY}

	/** @returns {string} */
	get writableList() {
		return Registers.#WRITABLE_REGEX.source
			.replace(/^\^\[/, '')
			.replace(/\]\$$/, '')
			.replace(/\\/g, '');
	}

	/** @returns {string} */
	get readableList() {
		return Registers.#READABLE_REGEX.source
			.replace(/^\^\[/, '')
			.replace(/\]\$$/, '')
			.replace(/\\/g, '');
	}
};

Wasavi.Marks = class {
	/** @type {WasaviApp} */
	#app;
	/** @type {WasaviEditor} */
	#buffer;
	/**
	 * Marks may be stored either as real `WasaviPosition` instances (via
	 * `#restore`) or as plain `{row, col}` pairs (via `set`/`setPrivate` from
	 * serialized undo data), hence the lenient value type.
	 * @type {Record<string, WasaviPositionLike>}
	 */
	#marks = {};

	/**
	 * @param {WasaviApp} app
	 * @param {unknown} [value]
	 */
	constructor(app, value) {
		this.#app = app;
		this.#buffer = app.buffer;
		this.load(value);
	}

	/** @returns {string} */
	#serialize() {
		var result = [];
		for (var i in this.#marks) {
			result.push([i, this.#marks[i].row, this.#marks[i].col].join('\t'));
		}
		return window.btoa(result.join('\n'));
	}

	/**
	 * @param {unknown} value
	 * @returns {Record<string, { row: number, col: number }>}
	 */
	#unserialize(value) {
		/** @type {Record<string, { row: number, col: number }>} */
		var result = {};
		isString(value) && window.atob(value)
			.split('\n')
			.forEach(function (line) {
				var fields = line.split('\t');
				if (fields[0].length) {
					result[fields[0]] = {
						row: parseInt(fields[1], 10),
						col: parseInt(fields[2], 10)
					};
				}
			});
		return result;
	}

	/**
	 * @param {unknown} src
	 * @returns {void}
	 */
	#restore(src) {
		var unserialized = this.#unserialize(src);

		for (var i in unserialized) {
			if (!this.isValidName(i)) continue;
			var item = unserialized[i];
			if (!isObject(item)) continue;
			if (!isNumber(item.row)) continue;
			if (!isNumber(item.col)) continue;

			var row = item.row;
			var col = item.col;
			if (isNaN(row) || isNaN(col)) continue;

			this.#marks[i] = (new Wasavi.Position(row, col)).round(this.#buffer);
		}
	}

	/** @returns {string} */
	save() {
		return this.#serialize();
	}

	/**
	 * @param {unknown} [value]
	 * @returns {void}
	 */
	load(value) {
		this.#marks = {};
		this.#restore(value || '');
	}

	/**
	 * @param {string} name
	 * @returns {boolean}
	 */
	isValidName(name) {
		return /^[a-z'\^<>]/.test(name);
	}

	/**
	 * @param {string} name
	 * @returns {string}
	 */
	#regalizeName(name) {
		if (name == '`') {
			name = "'";
		}
		return name;
	}

	/**
	 * @param {string} name
	 * @param {WasaviPositionLike} pos
	 * @returns {void}
	 */
	set(name, pos) {
		name = this.#regalizeName(name);
		if (this.isValidName(name)) {
			this.#marks[name] = pos;
		}
	}

	/**
	 * @param {string} name
	 * @param {WasaviPositionLike | null} [pos]
	 * @returns {void}
	 */
	setPrivate(name, pos) {
		name = '$' + name;
		if (pos) {
			this.#marks[name] = pos;
		}
		else {
			delete this.#marks[name];
		}
	}

	/**
	 * @param {string} name
	 * @returns {WasaviPositionLike | undefined}
	 */
	get(name) {
		name = this.#regalizeName(name);
		return this.isValidName(name) && name in this.#marks
			? this.#marks[name]
			: undefined;
	}

	/**
	 * @param {string} name
	 * @returns {WasaviPositionLike | undefined}
	 */
	getPrivate(name) {
		name = '$' + name;
		return name in this.#marks ? this.#marks[name] : undefined;
	}

	/**
	 * @param {WasaviPosition} [pos]
	 * @returns {void}
	 */
	setJumpBaseMark(pos) {
		this.set("'", pos || this.#app.buffer.selectionStart);
	}

	/**
	 * @param {WasaviPosition} [pos]
	 * @returns {void}
	 */
	setInputOriginMark(pos) {
		this.set('^', pos || this.#app.buffer.selectionStart);
	}

	/** @returns {WasaviPositionLike | undefined} */
	getJumpBaseMark() {
		return this.get("'");
	}

	/** @returns {WasaviPositionLike | undefined} */
	getInputOriginMark() {
		return this.get('^');
	}

	/**
	 * @param {WasaviPositionLike} pos
	 * @param {((registerFoldedMark: (fragment: ParentNode) => void) => void) | null | undefined} [func]
	 * @returns {void}
	 */
	update(pos, func) {
		var buffer = this.#buffer;
		var marks = this.#marks;
		/** @type {Set<string>} */
		var foldedMarks = new Set();

		/** @returns {Set<string>} */
		const setMarks = () => {
			/** @type {Set<string>} */
			var usedMarks = new Set();
			var r = document.createRange();
			for (var i in marks) {
				var m = marks[i];
				if (m.row >= buffer.rowLength
				||  m.row == buffer.rowLength - 1 && m.col > buffer.rows(m.row).length) {
					m.row = m.col = 0;
				}
				if (m.row > pos.row || m.row == pos.row && m.col >= pos.col) {
					usedMarks.add(i);

					var iter = document.createNodeIterator(
						buffer.rowNodes(m),
						window.NodeFilter.SHOW_TEXT);
					var totalLength = 0;
					var done = false;
					var node;

					while ((node = iter.nextNode())) {
						var next = totalLength + (node.nodeValue?.length ?? 0);
						if (totalLength <= m.col && m.col < next) {
							r.setStart(node, m.col - totalLength);
							r.setEnd(node, m.col - totalLength);
							var span = document.createElement('span');
							span.className = Wasavi.MARK_CLASS;
							span.dataset.index = i;
							r.insertNode(span);
							done = true;
							break;
						}
						totalLength = next;
					}

					if (!done) {
						var span = document.createElement('span');
						span.className = Wasavi.MARK_CLASS;
						span.dataset.index = i;
						buffer.rowNodes(m).appendChild(span);
					}
				}
			}
			return usedMarks;
		};

		/**
		 * @param {Set<string>} usedMarks
		 * @returns {void}
		 */
		const releaseMarks = usedMarks => {
			var nodes = buffer.getSpans(Wasavi.MARK_CLASS);
			for (var i = 0, goal = nodes.length; i < goal; i++) {
				var span = nodes[i];
				if (!(span instanceof HTMLElement) || span.parentNode == null) continue;
				var index = span.dataset.index ?? '';
				marks[index].row = buffer.indexOf(span.parentNode);
				marks[index].col = calcColumn(span);
				var pa = span.parentNode;
				pa.removeChild(span);
				pa.normalize();
				usedMarks.delete(index);
			}

			var ss = buffer.selectionStart;
			for (const key of usedMarks) {
				if (foldedMarks.has(key)) {
					marks[key] = ss;
				}
				else {
					delete marks[key];
				}
			}
		};

		/**
		 * @param {HTMLElement} span
		 * @returns {number}
		 */
		const calcColumn = span => {
			var result = 0;
			var parent = span.parentNode;
			if (parent == null) return result;
			var nodes = parent.childNodes;
			for (var i = 0, goal = nodes.length; i < goal && nodes[i] != span; i++) {
				var node = nodes[i];
				if (node.nodeType == 3) {
					result += node.nodeValue?.length ?? 0;
				}
			}
			return result;
		};

		/**
		 * @param {ParentNode} fragment
		 * @returns {void}
		 */
		const registerFoldedMark = fragment => {
			var foldNodes = fragment.querySelectorAll('span.' + Wasavi.MARK_CLASS);
			for (var i = 0, goal = foldNodes.length; i < goal; i++) {
				var node = foldNodes[i];
				if (!(node instanceof HTMLElement)) continue;
				var index = node.dataset.index ?? '';
				foldedMarks.add(index);
			}
		};

		/** @type {Set<string>} */
		var usedMarks = new Set();
		try {
			usedMarks = setMarks();
			func && func(registerFoldedMark);
		}
		finally {
			releaseMarks(usedMarks);
		}
	}

	/** @returns {void} */
	clear() {
		this.#marks = {};
	}

	/** @returns {readonly string[]} */
	dump() {
		var a = [
		//     mark  line   col  text
		//     a    00000  0000  aaaaaaaaaa
			_('*** marks ***'),
			  'mark  line   col   text',
			  '====  =====  ====  ===='];
		for (var i in this.#marks) {
			if (i.charAt(0) == '$') continue;
			a.push(
				' ' + i + '  ' +
				'  ' + ('    ' + (this.#marks[i].row + 1)).substr(-5) +
				'  ' + ('   ' + (this.#marks[i].col)).substr(-4) +
				'  ' + toVisibleString(this.#buffer.rows(this.#marks[i]))
			);
		}
		return a;
	}

	/** @returns {Record<string, { row: number, col: number }>} */
	dumpData() {
		/** @type {Record<string, { row: number, col: number }>} */
		var result = {};
		for (var i in this.#marks) {
			result[i] = {
				row:this.#marks[i].row,
				col:this.#marks[i].col
			};
		}
		return result;
	}
};

Wasavi.Editor = function (element) {
	this.elm = $(element);
	if (!this.elm) {
		throw new TypeError('*** wasavi: Editor constructor: invalid element: ' + element);
	}
	this._ssrow = this._sscol = this._serow = this._secol = 0;
	this.isLineOrientSelection = false;

	this.unicodeCacheMax = 20;
	this._unicodeCache = null;
};
Wasavi.Editor.prototype = new function () {
	function arg2pos (args) {
		if (args[0] instanceof Wasavi.Position) {
			return args[0].clone();
		}
		else {
			return new Wasavi.Position(args[0], args[1]);
		}
	}
	function popLastArg (args, type) {
		type || (type = 'function');
		if (args.length && typeof args.lastItem == type) {
			var func = args.lastItem;
			args.pop();
			return func;
		}
		return null;
	}
	function setRange (r, pos, isEnd) {
		var iter = document.createNodeIterator(
			this.rowNodes(pos), window.NodeFilter.SHOW_TEXT, null, false);
		var totalLength = 0;
		var done = false;
		var node, prevNode;
		while ((node = iter.nextNode())) {
			var next = totalLength + node.nodeValue.length;
			if (totalLength <= pos.col && pos.col < next) {
				isEnd ? r.setEnd(node, pos.col - totalLength) :
						r.setStart(node, pos.col - totalLength);
				prevNode = null;
				done = true;
				break;
			}
			totalLength = next;
			prevNode = node;
		}

		if (!done) {
			if (isEnd) {
				var rowNode = this.rowNodes(pos);
				var node = rowNode.lastChild;
				if (!node) {
					node = rowNode.appendChild(document.createTextNode(''));
				}
				node.nodeType == 1 ?
					r.setEndAfter(node) :
					r.setEnd(node, node.nodeValue.length);
			}
			else {
				r.setStartBefore(this.rowNodes(pos, true));
			}
		}
	}
	function select (s, e) {
		if (arguments.length == 0) {
			s = this.selectionStart;
			e = this.selectionEnd;
		}
		else if (arguments.length != 2) {
			throw new TypeError('select: invalid length of argument');
		}

		if (s.row > e.row || s.row == e.row && s.col > e.col) {
			var tmp = s;
			s = e;
			e = tmp;
		}

		var r = document.createRange();
		setRange.call(this, r, s);
		setRange.call(this, r, e, true);
		return {r:r, s:s, e:e};
	}
	function selectRows (s, e) {
		if (arguments.length == 0) {
			s = this.selectionStart;
			e = this.selectionEnd;
		}
		else if (arguments.length != 2) {
			throw new TypeError('selectRows: invalid length of argument');
		}

		if (s.row > e.row || s.row == e.row && s.col > e.col) {
			var tmp = s;
			s = e;
			e = tmp;
		}

		s.col = 0;
		e.col = this.isLineOrientSelection ?
			0 : this.rows(e).length;

		var r = document.createRange();
		r.setStartBefore(this.rowNodes(s));
		r.setEndAfter(this.rowNodes(e, true));
		return {r:r, s:s, e:e};
	}
	function appendText (text, sentinel) {
		var row = this.elm.insertBefore(document.createElement('div'), sentinel);
		row.textContent = text || '';
		return row;
	}
	function appendNewline (sentinel) {
		var newline = this.elm.insertBefore(document.createElement('span'), sentinel);
		newline.className = 'newline';
		newline.textContent = '\n';
		return newline;
	}
	function appendRow (text, sentinel) {
		var row = appendText.call(this, text, sentinel);
		var newline = appendNewline.call(this, sentinel);
		return row;
	}
	function ensureSentinelNewline (node) {
		if (node.lastChild && node.lastChild.nodeType == 3) {
			node.lastChild.appendData('\n');
		}
		else {
			node.appendChild(document.createTextNode('\n'));
		}
	}
	function removeSentinelNewline (node) {
		if (node.lastChild) {
			var lastChild = node.lastChild;
			switch (lastChild.nodeType) {
			case 1:
				removeSentinelNewline(lastChild);
				break;
			case 3:
				if (lastChild.nodeValue.length) {
					while (lastChild.nodeValue.substr(-1) == '\n') {
						lastChild.deleteData(lastChild.nodeValue.length - 1, 1);
					}
				}
				else {
					removeSentinelNewline(lastChild.previousSibling);
				}
				break;
			}
		}
	}
	return {
		// condition
		isEndOfText: function () {
			var a = arg2pos(arguments);
			var rowLength = this.rowLength;
			if (a.row < 0 || a.row >= rowLength) {
				throw new RangeError(`isEndOfText: argument row (${a.row}) out of range.`);
			}
			if (a.row < rowLength - 1) {
				return false;
			}
			if (a.row == rowLength - 1 && a.col < this.rows(rowLength - 1).length) {
				return false;
			}
			return true;
		},
		isNewline: function () {
			var a = arg2pos(arguments);
			var rowLength = this.rowLength;
			if (a.row < 0 || a.row >= rowLength) {
				throw new RangeError(`isNewline: argument row (${a.row}) out of range.`);
			}
			if (a.row == rowLength - 1 || a.col < this.rows(a).length) {
				return false;
			}
			return true;
		},

		// getter
		getValue: function (from, to, newline) {
			var result, rg;
			var rowLength = this.rowLength;

			if (typeof from != 'number' || from < 0) {
				from = 0;
			}
			if (typeof to != 'number' || to >= rowLength) {
				to = rowLength - 1;
			}

			rg = document.createRange();
			rg.setStartBefore(this.rowNodes(from));
			rg.setEndAfter(this.rowNodes(to));

			result = rg.toString();
			result = toNativeControl(result);

			if (isString(newline)) {
				result = result.replace(/\n/g, newline);
			}

			return result;
		},
		rowNodes: function (arg, newline) {
			var row = arg instanceof Wasavi.Position ? arg.row : arg;

			if (typeof row != 'number' || isNaN(row)) {
				throw new TypeError(`rowNodes: argument row is not a number`);
			}
			if (row < 0 || row >= this.rowLength) {
				throw new RangeError(`rowNodes: argument row (${row}) out of range`);
			}

			var result = this.elm.childNodes[row * 2 + (newline ? 1 : 0)];

			if (!result.firstChild) {
				result.appendChild(document.createTextNode(''));
			}

			return result;
		},
		rowTextNodes: function (arg) {
			return this.rowNodes(arg).firstChild;
		},
		rows: function (arg) {
			return this.rowNodes(arg).textContent;
		},
		charAt: function () {
			var a = arg2pos(arguments);
			if (a.row < 0 || a.row >= this.rowLength) {
				return undefined;
			}
			var content = this.rows(a);
			return a.col >= content.length ? '\n' : content.charAt(a.col);
		},
		charCodeAt: function () {
			return this.charAt.apply(this, arguments).charCodeAt(0);
		},
		charClassAt: function (a, treatNewlineAsSpace, extraWordRegex) {
			var ch = this.charAt(a);
			if (ch == undefined) {
				return undefined;
			}
			var cp = ch.charCodeAt(0);
			if (treatNewlineAsSpace && cp == 0x0a) {
				return 0;
			}
			if (extraWordRegex instanceof RegExp && extraWordRegex.test(ch)) {
				// treat as latin1 word component
				return 0x100 + 1;
			}
			return unicodeUtils.getScriptClass(cp);
		},
		charRectAt: function (position, length) {
			const CLASS_NAME = 'char-rect-at';
			try {
				var span = this.emphasis(position, length || 1, CLASS_NAME)[0];
				return span ?
					span.getBoundingClientRect() :
					this.rowNodes(position).getBoundingClientRect();
			}
			finally {
				this.unEmphasis(CLASS_NAME);
			}
		},
		ensureNewline: function () {
			var a = arg2pos(arguments);
			if (a.row < 0 || a.row >= Math.ceil(this.elm.childNodes.length / 2)) {
				return;
			}
			var newline = this.rowNodes(a, true);
			if (!newline || newline.className != 'newline') {
				appendNewline.call(this, newline);
			}
		},
		getSelectionRange: function () {
			return this.isLineOrientSelection ?
				selectRows.apply(this, arguments).r :
				select.apply(this, arguments).r;
		},
		getSelection: function () {
			if (this.isLineOrientSelection) {
				return this.getSelectionLinewise.apply(this, arguments);
			}
			else {
				var r = select.apply(this, arguments);
				var content = r.r.toString();
				return content;
			}
		},
		getSelectionLinewise: function () {
			var r = selectRows.apply(this, arguments);
			var content = r.r.toString();
			if (content.length && content.substr(-1) != '\n') {
				content += '\n';
			}
			return content;
		},
		leftPos: function () {
			var a = arg2pos(arguments);
			if (a.col == 0) {
				if (a.row > 0) {
					a.row--;
					a.col = this.rows(a).length;
				}
			}
			else {
				a.col--;
			}
			return a;
		},
		leftClusterPos: function () {
			var a = arg2pos(arguments);
			if (a.col == 0) {
				if (a.row > 0) {
					a.row--;
					a.col = this.rows(a).length;
				}
			}
			else {
				var clusters = this.getGraphemeClusters(a);
				var index = clusters.getClusterIndexFromUTF16Index(a.col);
				a.col = clusters.rawIndexAt(index - 1);
			}
			return a;
		},
		rightPos: function () {
			var a = arg2pos(arguments);
			var node = this.rows(a);
			if (a.col >= node.length) {
				if (a.row < this.rowLength - 1) {
					a.row++;
					a.col = 0;
				}
			}
			else {
				a.col++;
			}
			return a;
		},
		rightClusterPos: function () {
			var a = arg2pos(arguments);
			var node = this.rows(a);
			if (a.col >= node.length) {
				if (a.row < this.rowLength - 1) {
					a.row++;
					a.col = 0;
				}
			}
			else {
				var clusters = this.getGraphemeClusters(a);
				var index = clusters.getClusterIndexFromUTF16Index(a.col);
				a.col = clusters.rawIndexAt(index + 1);
			}
			return a;
		},
		indexOf: function (node) {
			var result = Array.prototype.indexOf.call(this.elm.children, node);
			return result >= 0 ? result >> 1 : result;
		},
		getLineTopOffset: function () {
			var a = arg2pos(arguments);
			a.col = 0;
			return a;
		},
		getLineTailOffset: function () {
			var a = arg2pos(arguments);
			a.col = this.rows(a).length;
			return a;
		},
		getLineTopOffset2: function () {
			var a = arg2pos(arguments);
			var re = spc('^(S*).*$').exec(this.rows(a));
			a.col = re ? re[1].length : 0;
			return a;
		},
		getIndent: function () {
			var a = arg2pos(arguments);
			while (a.row >= 0 &&
				(
					this.rowNodes(a).getAttribute('data-indent-ignore') == '1' ||
					this.rows(a) == ''
				)
			) {
				a.row--;
			}
			return a.row >= 0 ? spc('^S*').exec(this.rows(a))[0] : '';
		},
		getBackIndent: function () {
			var a = arg2pos(arguments);
			while (--a.row >= 0 &&
				(
					this.rowNodes(a).getAttribute('data-indent-ignore') == '1' ||
					this.rows(a) == ''
				)
			) {}
			return a.row >= 0 ? spc('^S*').exec(this.rows(a))[0] : '';
		},
		getSpans: function (className, start, end) {
			var q = ['#wasavi_editor>div'];
			if (typeof start == 'number') {
				if (start < 0) {
					start = this.rowLength + start;
					end = false;
				}
				// this factor "2" depends row structure
				q.push(':nth-child(n+' + (start * 2 + 1) + ')');
			}
			if (typeof end == 'number') {
				end = Math.min(end, this.rowLength - 1);
				// this factor "2" depends row structure
				q.push(':nth-child(-n+' + (end * 2 + 1) + ')');
			}
			if (q.length == 3 && start == end) {
				q.pop();
				q.pop();
				// this factor "2" depends row structure
				q.push(':nth-child(' + (start * 2 + 1) + ')');
			}
			q.push(' span');
			if (typeof className == 'string' && className != '') {
				q.push('.' + className);
			}
			return document.querySelectorAll(q.join(''));
		},
		// UAX#29
		invalidateUnicodeCache: function () {
			this._unicodeCache = null;
		},
		initUnicodeCache: function () {
			if (!this._unicodeCache) {
				this._unicodeCache = {
					clusters: [],
					clusterIndexes: [],
					words: [],
					wordsIndexes: []
				};
			}
			return this._unicodeCache;
		},
		getGraphemeClusters: function (n) {
			if (n == undefined) {
				n = this._ssrow;
			}
			else if (n instanceof Wasavi.Position) {
				n = n.row;
			}
			if (typeof n != 'number' || isNaN(n)) {
				throw new TypeError('Editor#getGraphemeClusters: invalid arg: ' + n);
			}
			var uc = this.initUnicodeCache();
			if (!uc.clusters[n]) {
				uc.clusters[n] = Unistring(this.rows(n));
				uc.clusterIndexes.push(n);
				while (uc.clusterIndexes.length > this.unicodeCacheMax) {
					var top = uc.clusterIndexes.shift();
					delete uc.clusters[top];
				}
			}
			return uc.clusters[n];
		},
		getWords: function (n) {
			if (n == undefined) {
				n = this._ssrow;
			}
			else if (n instanceof Wasavi.Position) {
				n = n.row;
			}
			if (typeof n != 'number' || isNaN(n)) {
				throw new TypeError('Editor#getWords: invalid arg: ' + n);
			}
			var uc = this.initUnicodeCache();
			if (!uc.words[n]) {
				uc.words[n] = Unistring.getWords(this.rows(n), true);
				uc.wordsIndexes.push(n);
				while (uc.wordsIndexes.length > this.unicodeCacheMax) {
					var top = uc.wordsIndexes.shift();
					delete uc.words[top];
				}
			}
			return uc.words[n];
		},
		getClosestOffsetToPixels: function (n, pixels) {
			var clusters = this.getGraphemeClusters(n);
			var index = clusters.getClusterIndexFromUTF16Index(n.col);
			if (clusters.length == 0 || index < 0) {
				n.col = 0;
				return n;
			}

			var node = $('wasavi_singleline_scaler');
			var row = this.rowLength - 1;
			node.textContent = this.rows(n);

			var r = document.createRange();
			r.setStart(node.firstChild, n.col);
			r.setEnd(node.firstChild, node.textContent.length);
			var right = document.createElement('span');
			right.className = 'closest';
			r.surroundContents(right);

			if (right && right.firstChild) {
				var width = 0;
				var widthp = 0;
				var delta = 1;
				var phase = 0;

				var rightText = right.firstChild;
				var left = right.parentNode.insertBefore(document.createElement('span'), right);
				var leftText = left.appendChild(document.createTextNode(''));

				left.className = 'closest';
				//left.style.backgroundColor = 'cyan';
				//right.style.backgroundColor = 'red';

				while (index < clusters.length) {
					var clusterLength = Math.min(delta, clusters.length - index);
					var fragment = clusters.substr(index, clusterLength).toString();
					var length = fragment.length;

					leftText.appendData(fragment);
					rightText.deleteData(0, length);

					index += delta;
					width = left.offsetWidth;

					if (width >= pixels) {
						if (phase == 2 || width == pixels) {
							index -= Math.abs(widthp - pixels) <= Math.abs(width - pixels) ? 1 : 0;
							break;
						}

						index -= delta;
						leftText.deleteData(
							leftText.nodeValue.length - length, length);
						rightText.insertData(0, fragment);
						if (phase == 1) {
							if (delta > 2) {
								delta = Math.max(1, delta >> 1);
							}
							else {
								delta = 1;
								phase = 2;
							}
						}
						else {
							phase = 1;
							delta = Math.max(1, delta >> 1);
						}
						continue;
					}

					widthp = width;
					if (phase == 0) {
						delta <<= 1;
					}
				}
			}

			node.textContent = '';
			n.col = clusters.rawIndexAt(minmax(0, index, clusters.length));
			return n;
		},

		// setter
		setRow: function (arg, text) {
			var row4 = arg;
			if (arg instanceof Wasavi.Position) {
				row4 = arg.row;
			}
			this.rowNodes(row4).textContent = trimTerm(text);
		},
		setSelectionRange: function () {
			if (arguments.length == 1) {
				if (arguments[0] instanceof Wasavi.Position) {
					this.selectionStart = arguments[0].clone();
					this.selectionEnd = arguments[0].clone();
				}
				else if (typeof arguments[0] == 'number') {
					this.selectionStart = this.linearPositionToBinaryPosition(arguments[0]);
				}
			}
			else if (arguments.length > 1) {
				if (arguments[0] instanceof Wasavi.Position) {
					this.selectionStart = arguments[0].clone();
				}
				else if (typeof arguments[0] == 'number') {
					this.selectionStart = this.linearPositionToBinaryPosition(arguments[0]);
				}
				if (arguments[1] instanceof Wasavi.Position) {
					this.selectionEnd = arguments[1].clone();
				}
				else if (typeof arguments[1] == 'number') {
					this.selectionEnd = this.linearPositionToBinaryPosition(arguments[1]);
				}
			}
		},

		// method
		adjustBackgroundImage: function () {
			var y = 0;
			if (this.rowLength) {
				var last = this.rowNodes(this.rowLength - 1);
				y = last.offsetTop + last.offsetHeight;
			}
			var desc = '0 ' + y + 'px';
			if (this.elm.style.backgroundPosition != desc) {
				this.elm.style.backgroundPosition = desc;
			}
		},
		adjustLineNumberClass: function (isAbsolute, isRelative) {
			var newClass = '';
			if (isAbsolute) {
				newClass = (isRelative ? 'nar' : 'na') +
					' n' + Math.min(
						Wasavi.LINE_NUMBER_MAX_WIDTH,
						(this.rowLength + '').length);
			}
			else if (isRelative) {
				newClass = 'nr n' + Wasavi.LINE_NUMBER_RELATIVE_WIDTH;
			}
			if (this.elm.classList.contains('list')) {
				newClass += ' list';
			}
			if (this.elm.className != newClass) {
				this.elm.className = newClass;
			}
		},
		adjustLineNumber: function () {
			var desc = 'na 0 nr ' + (this.selectionStartRow + 1);
			if (this.elm.style.counterReset != desc) {
				this.elm.style.counterReset = desc;
			}
		},
		adjustWrapGuide: function (width, unit) {
			var o = $('wasavi_textwidth_guide'), display, left;
			if (!o) return;
			if (width <= 0) {
				display = 'none';
			}
			else {
				display = 'block';
				left = (this.elm.childNodes[0].offsetLeft + width * unit) + 'px';
			}
			if (display !== undefined && display != o.style.display) {
				o.style.display = display;
			}
			if (left !== undefined && left != o.style.left) {
				o.style.left = left;
				o.style.height = this.elm.offsetHeight + 'px';
				o.textContent = width;
			}
		},
		updateActiveRow: function () {
			Array.prototype.forEach.call(
				document.querySelectorAll('#wasavi_editor>div.current'),
				function (node) {node.removeAttribute('class');}
			);
			this.rowNodes(this.selectionStartRow).className = 'current';
		},
		insertChars: function (pos, text) {
			var rowNode = this.rowNodes(pos);
			var iter = document.createNodeIterator(
				rowNode, window.NodeFilter.SHOW_TEXT, null, false);
			var totalLength = 0;
			var node;

			ensureSentinelNewline(rowNode);
			try {
				while ((node = iter.nextNode())) {
					var next = totalLength + node.nodeValue.length;
					if (totalLength <= pos.col && pos.col < next) {
						var pnode = node.previousSibling;
						var index = pos.col - totalLength;

						if (index == 0
						&&  pnode
						&&  pnode.nodeName == 'SPAN'
						&&  pnode.className == Wasavi.MARK_CLASS) {
							pnode.parentNode.insertBefore(document.createTextNode(text), pnode);
						}
						else {
							node.insertData(index, text);
						}

						pos.col += text.length;
						break;
					}
					totalLength = next;
				}

				this.invalidateUnicodeCache();

				return pos;
			}
			finally {
				removeSentinelNewline(rowNode);
			}
		},
		overwriteChars: function (pos, text) {
			text = Unistring(text);

			var rowNode = this.rowNodes(pos);
			var iter = document.createNodeIterator(
				rowNode, window.NodeFilter.SHOW_TEXT, null, false);
			var totalLength = 0;
			var done = false;
			var node;

			while (text.length && (node = iter.nextNode())) {
				var next = totalLength + node.length;
				if (!(totalLength <= pos.col && pos.col < next)) {
					totalLength = next;
					continue;
				}

				var nodeText = Unistring(node.nodeValue);
				var nodeUTF16Offset = Math.max(pos.col - totalLength, 0);
				var nodeClusterOffset = nodeText.getClusterIndexFromUTF16Index(nodeUTF16Offset);
				var overwriteClusterCount = next >= this.rows(pos).length ?
					text.length :
					Math.min(nodeText.length - nodeClusterOffset, text.length);
				var overwriting = text.substr(0, overwriteClusterCount);

				node.nodeValue = Unistring('')
					.append(nodeText.substring(0, nodeClusterOffset))
					.append(overwriting)
					.append(nodeText.substring(nodeClusterOffset + overwriteClusterCount))
					.toString();
				pos.col += overwriting.toString().length;
				text = text.substr(overwriteClusterCount);
				totalLength += node.length;
				done = true;
			}

			if (!done) {
				if (rowNode.lastChild && rowNode.lastChild.nodeType == 3) {
					rowNode.lastChild.nodeValue += text;
				}
				else {
					rowNode.appendChild(document.createTextNode(text));
					rowNode.normalize();
				}
				pos.col += text.length;
			}

			this.invalidateUnicodeCache();

			return pos;
		},
		shift: function (row, rowCount, shiftCount, shiftWidth, tabWidth, isExpandTab, indents) {
			if (rowCount < 1) return null;
			if (shiftWidth < 0) shiftWidth = 0;
			if (tabWidth < 1) tabWidth = 8;

			var shifted = multiply(' ', shiftWidth * Math.abs(shiftCount));
			var shiftLeftRegex = shifted.length ? new RegExp('^ {1,' + shifted.length + '}') : null;
			var currentIndents = [];

			function expandTab (row) {
				var marks = [];
				var marksInfo = {};
				var indentOriginal = '';
				var indentExpanded = '';
				var node = row.firstChild;
loop:			while (node) {
					switch (node.nodeType) {
					case 3:
						var left = '';
						var right = node.nodeValue;
						while (true) {
							var re;
							if ((re = /^\t/.exec(right))) {
								var nextTabCol = Math.floor(indentExpanded.length / tabWidth) * tabWidth +
												 tabWidth;
								var s = multiply(' ', nextTabCol - indentExpanded.length);
								indentOriginal += re[0];
								indentExpanded += s;
								left += s;
								right = right.substring(re[0].length);
							}
							else if ((re = /^ +/.exec(right))) {
								indentOriginal += re[0];
								indentExpanded += re[0];
								left += re[0];
								right = right.substring(re[0].length);
							}
							else if (right.length || !node.nextSibling) {
								node.nodeValue = left + right;
								break loop;
							}
							else {
								node.nodeValue = left + right;
								node = node.nextSibling;
								break;
							}
						}
						break;

					case 1:
						if (node.nodeName != 'SPAN' || node.className != Wasavi.MARK_CLASS) {
							throw new TypeError('unknown node found');
						}
						var next = node.nextSibling;
						var markName = node.dataset.index;
						marks.push([indentExpanded.length, node, markName]);
						marksInfo[markName] = indentOriginal.length;
						node.parentNode.removeChild(node);
						node = next;
						break;
					}
				}
				if (marks.length) {
					currentIndents.push([indentOriginal, marksInfo]);
				}
				else {
					currentIndents.push(indentOriginal);
				}
				row.normalize();
				return marks;
			}

			function shiftRight (row, marks) {
				var node = row.firstChild;
				if (!node || node.nodeType != 3) return;
				node.insertData(0, shifted);
				for (var i = 0, goal = marks.length; i < goal; i++) {
					marks[i][0] += shifted.length;
				}
			}

			function shiftLeft (row, marks) {
				var node = row.firstChild;
				if (!node || node.nodeType != 3) return;
				if (!shiftLeftRegex) return;
				var re = shiftLeftRegex.exec(node.nodeValue);
				if (!re) return;
				node.deleteData(0, re[0].length);
				for (var i = 0, goal = marks.length; i < goal; i++) {
					marks[i][0] = Math.max(0, marks[i][0] - re[0].length);
				}
			}

			function shiftByOriginalIndent (row, marks, indentInfo) {
				var node = row.firstChild;
				if (!node || node.nodeType != 3) return;
				var indent, marksInfo;
				if (indentInfo instanceof Array) {
					indent = indentInfo[0];
					marksInfo = indentInfo[1];
				}
				else {
					indent = indentInfo;
				}
				node.nodeValue = indent + node.nodeValue.replace(spc('^S+'), '');
				if (!marksInfo) return;
				for (var i = 0, goal = marks.length; i < goal; i++) {
					var markName = marks[i][2];
					if (markName in marksInfo) {
						marks[i][0] = marksInfo[markName];
					}
					else {
						marks.push([marksInfo[markName], null, markName, false]);
					}
				}
			}

			function collectTabs (row, marks) {
				var node = row.firstChild;
				if (!node || node.nodeType != 3) return;
				var re = /^ +/.exec(node.nodeValue);
				if (!re) return;
				var tabs = '';
				var left = re[0];
				var right = node.nodeValue.substring(re[0].length);
				var spaces = multiply(' ', tabWidth);
				var offsetExpanded = 0;
				var index;
				while ((index = left.indexOf(spaces)) === 0) {
					for (var i = 0, goal = marks.length; i < goal; i++) {
						if (marks[i][0] >= offsetExpanded) {
							marks[i][0] = Math.max(offsetExpanded, marks[i][0] - (tabWidth - 1));
						}
					}
					offsetExpanded += tabWidth;
					tabs += '\t';
					left = left.substring(spaces.length);
				}
				node.nodeValue = tabs + left + right;
			}

			function restoreMarks (row, marks) {
				if (marks.length == 0) return;
				marks.sort(function (a, b) {return b[0] - a[0]});
				for (var i = 0, goal = marks.length; i < goal; i++) {
					var offset = marks[i][0];
					var mark = marks[i][1];
					var text = row.firstChild;
					if (!text) continue;
					if (!mark) {
						mark = document.createElement('span');
						mark.className = Wasavi.MARK_CLASS;
						mark.dataset.index = marks[i][2];
					}
					if (offset == text.nodeValue.length) {
						text.parentNode.insertBefore(mark, text.nextSibling);
					}
					else if (offset < text.nodeValue.length) {
						var rest = text.splitText(offset);
						rest.parentNode.insertBefore(mark, rest);
					}
				}
			}

			function nop () {}

			var goal = Math.min(row + rowCount, this.rowLength);
			var doShift, doCollectTabs;
			if (indents) {
				doCollectTabs = isExpandTab ? nop : collectTabs;
				for (var i = row, j = 0; i < goal; i++) {
					var node = this.rowNodes(i);
					var marks = expandTab(node);
					shiftByOriginalIndent(node, marks, indents[j++]);
					doCollectTabs(node, marks);
					restoreMarks(node, marks);
				}
			}
			else {
				doShift = shiftCount == 0 ? nop : shiftCount < 0 ? shiftLeft : shiftRight;
				doCollectTabs = isExpandTab ? nop : collectTabs;
				for (var i = row; i < goal; i++) {
					var node = this.rowNodes(i);
					var marks = expandTab(node);
					doShift(node, marks);
					doCollectTabs(node, marks);
					restoreMarks(node, marks);
				}
			}

			this.invalidateUnicodeCache();

			return currentIndents;
		},
		deleteRange: (function () {
			function deleteCharwise (r, func) {
				var content = r.r.toString();
				var result = content.length;

				if (result == 0) {
					return result;
				}
				if (func) {
					func(content, r.r.cloneContents());
				}
				if (r.s.row == r.e.row) {
					r.r.deleteContents();
					this.rowNodes(r.s).normalize();
				}
				else {
					// multiple rows

					// top line
					var r2 = document.createRange();
					setRange.call(this, r2, r.s);
					setRange.call(this, r2, new Wasavi.Position(r.s.row, this.rows(r.s).length), true);
					r2.deleteContents();

					// bottom line
					setRange.call(this, r2, r.e);
					setRange.call(this, r2, new Wasavi.Position(r.e.row, this.rows(r.e).length), true);
					this.rowNodes(r.s).appendChild(r2.extractContents());
					this.rowNodes(r.s).normalize();

					// middle lines
					if (r.e.row - r.s.row >= 1) {
						r2.setStartBefore(this.rowNodes(r.s.row + 1));
						r2.setEndAfter(this.rowNodes(r.e.row).nextSibling);
						r2.deleteContents();
					}
				}
				return result;
			}
			function deleteLinewise (r, func) {
				var content = r.r.toString();
				var result = r.e.row - r.s.row + 1;

				if (func) {
					func(content, r.r.cloneContents());
				}
				r.r.deleteContents();
				if (this.rowLength == 0) {
					appendRow.call(this);
				}
				if (r.s.row >= this.rowLength) {
					r.s.row = this.rowLength - 1;
				}
				return result;
			}
			return function deleteRange () {
				var args = toArray(arguments);
				var func = popLastArg(args);
				var result, rangeInfo;

				if (this.isLineOrientSelection) {
					rangeInfo = selectRows.apply(this, args);
					result = deleteLinewise.call(this, rangeInfo, func);
				}
				else {
					rangeInfo = select.apply(this, args);
					result = deleteCharwise.call(this, rangeInfo, func);
				}

				this.selectionStart = rangeInfo.s;
				this.selectionEnd = rangeInfo.s;
				this.invalidateUnicodeCache();

				return result;
			};
		})(),
		selectRowsLinewise: function (count) {
			var s = this.selectionStart;
			var e = new Wasavi.Position(
				Math.min(
					this.selectionEndRow + count - 1,
					this.rowLength - 1),
				0);
			this.isLineOrientSelection = true;
			var r = selectRows.call(this, s, e);
			this.selectionStart = r.s;
			this.selectionEnd = r.e;
			return r.e.row - r.s.row + 1;
		},
		divideLine: function (n) {
			n || (n = this.selectionStart);
			var div1 = this.rowNodes(n);
			var div2 = appendRow.call(this, '', div1.nextSibling.nextSibling);
			var r = document.createRange();
			var iter = document.createNodeIterator(
				div1, window.NodeFilter.SHOW_TEXT, null, false);
			var totalLength = 0;
			var done = false;

			var node;
			while ((node = iter.nextNode())) {
				var next = totalLength + node.nodeValue.length;
				if (totalLength <= n.col && n.col < next) {
					r.setStart(node, n.col - totalLength);
					done = true;
					break;
				}
				else if (n.col == next) {
					r.setStartAfter(node);
					done = true;
					break;
				}
				totalLength = next;
			}

			div1.removeAttribute('contenteditable');

			if (done) {
				r.setEndAfter(div1.lastChild);
				div2.appendChild(r.extractContents());
			}

			n.col = 0;
			n.row++;

			this.selectionStart = n;
			this.selectionEnd = n;
			this.invalidateUnicodeCache();
		},
		extendSelectionTo: function (n) {
			var s = this.selectionStart;
			var e = this.selectionEnd;
			if (typeof n == 'number') {
				n = this.linearPositionToBinaryPosition(n);
			}
			if (n instanceof Wasavi.Position) {
				if (n.lt(s)) {
					this.selectionStart = n;
				}
				else if (n.gt(e)) {
					this.selectionEnd = n;
				}
			}
		},
		linearPositionToBinaryPosition: function (n) {
			var result;
			var iter = document.createNodeIterator(
				this.elm, window.NodeFilter.SHOW_TEXT, null, false);
			var totalLength = 0;
			var rowTopLength = 0;
			var node;
			var row = 0;

			while ((node = iter.nextNode())) {
				var next = totalLength + node.nodeValue.length;
				if (totalLength <= n && n < next) {
					result = new Wasavi.Position(row, n - rowTopLength);
					break;
				}
				if (node.nodeValue == '\n') {
					row++;
					rowTopLength = next;
				}
				totalLength = next;
			}

			return result;
		},
		binaryPositionToLinearPosition: function (a) {
			var r = document.createRange();
			setRange.call(this, r, new Wasavi.Position(0, 0), false);
			setRange.call(this, r, a, true);
			var result = r.toString().length;
			return result;
		},
		emphasis: function (pos, length, className) {
			if (pos instanceof Wasavi.Position) {
				pos = pos.clone();
			}
			else {
				pos = this.selectionStart;
			}
			if (typeof length != 'number') {
				throw new TypeError('emphasis: length is not a number');
			}

			var isInRange = false;
			var offset = 0;
			var r = document.createRange();
			var result = [];
			className || (className = Wasavi.EMPHASIS_CLASS);

			function surroundWithSpan (r) {
				var span = document.createElement('span');
				span.className = className;

				r.surroundContents(span);

				// Chrome removes text node which includes only newline.
				if (!span.firstChild) {
					span.appendChild(document.createTextNode(''));
				}

				result.push(span);
			}

whole:
			for (; length >= 0 && pos.row >= 0 && pos.row < this.rowLength; pos.row++) {
				var rowNode = this.rowNodes(pos);
				var iter = document.createNodeIterator(
					rowNode, window.NodeFilter.SHOW_TEXT, null, false);
				var totalLength = 0;
				var node;

				ensureSentinelNewline(rowNode);
				try {
					while ((node = iter.nextNode())) {
						if (!isInRange) {
							var next = totalLength + node.nodeValue.length;
							if (totalLength <= pos.col && pos.col < next) {
								offset = pos.col - totalLength;
								isInRange = true;
							}
							totalLength = next;
						}
						if (isInRange) {
							var nodeLength = node.nodeValue.length;
							if (offset + length <= nodeLength) {
								r.setStart(node, offset);
								r.setEnd(node, offset + length);
								surroundWithSpan(r);
								length = -1;
								break whole;
							}
							else if (nodeLength > 0) {
								r.setStart(node, offset);
								r.setEnd(node, nodeLength);
								surroundWithSpan(r);
								length -= nodeLength - offset;
								offset = 0;
								node = iter.nextNode();
							}
						}
					}
				}
				finally {
					removeSentinelNewline(rowNode);
				}
			}

			return result;
		},
		unEmphasis: function (className, start, end) {
			var nodes = this.getSpans(className || Wasavi.EMPHASIS_CLASS, start, end);
			if (nodes.length) {
				var r = document.createRange();
				for (var i = 0; i < nodes.length; i++) {
					var node = nodes[i];
					var pa = node.parentNode;
					r.selectNodeContents(node);
					var f = r.extractContents();
					r.setStartBefore(node);
					r.insertNode(f);
					r.selectNode(node);
					r.deleteContents();
					pa.normalize();
				}
			}
		},
		offsetBy: function (s, offset, treatLastLineAsNormal) {
			var row5 = s.row;
			var col = s.col;
			var last = this.rowLength - 1;
			while (offset > 0) {
				var text = this.rows(row5);
				if (treatLastLineAsNormal || row5 != last) {
					text += '\n';
				}
				var rest = text.length - col;
				col += offset;
				offset -= rest;
				if (col >= text.length) {
					if (row5 == last) {
						col = text.length;
						offset = 0;
					}
					else {
						row5++;
						col = 0;
					}
				}
			}
			return new Wasavi.Position(row5, col);
		},
		regalizeSelectionRelation: function () {
			var s = this.selectionStart;
			var e = this.selectionEnd;
			if (s.row > e.row || s.row == e.row && s.col > e.col) {
				this.selectionStart = e;
				this.selectionEnd = s;
			}
		},
		clipPosition: function () {
			function doClip (s) {
				var clipped = false;
				var n;
				if (s.row < 0) {
					s.row = 0;
					clipped = true;
				}
				else if (s.row > (n = this.rowLength - 1)) {
					s.row = n;
					clipped = true;
				}
				if (s.col < 0) {
					s.col = 0;
					clipped = true;
				}
				else if (s.col > (n = this.rows(s).length)) {
					s.col = n;
					clipped = true;
				}
				return clipped ? s : null;
			}
			var s = this.selectionStart;
			var e = this.selectionEnd;
			if (s.eq(e)) {
				s = doClip.call(this, s);
				if (s) {
					this.selectionStart = s;
					this.selectionEnd = s;
				}
			}
			else {
				s = doClip(this, s);
				e = doClip(this, e);
				s && (this.selectionStart = s);
				e && (this.selectionEnd = e);
			}
		},

		// getter properties
		get rowLength () {
			var length = this.elm.childNodes.length;
			return (length >> 1) + (length & 1);
		},
		get value () {
			return this.getValue(null, null, '\n');
		},
		get selected () {
			return this.selectionStart.ne(this.selectionEnd);
		},
		get selectionStart () {
			return new Wasavi.Position(this.selectionStartRow, this.selectionStartCol);
		},
		get selectionStartRow () {
			return this._ssrow;
		},
		get selectionStartCol () {
			return this._sscol;
		},
		get selectionEnd () {
			return new Wasavi.Position(this.selectionEndRow, this.selectionEndCol);
		},
		get selectionEndRow () {
			return this._serow;
		},
		get selectionEndCol () {
			return this._secol;
		},
		get scrollTop () {
			return this.elm.scrollTop;
		},
		get scrollLeft () {
			return this.elm.scrollLeft;
		},

		// setter properties
		set value (v) {
			emptyNodeContents(this.elm);
			v = v
				//.replace(/\r?\n$/, '')
				.replace(/\r?\n/g, '\n')
				.replace(/[\u0000-\u0008\u000b-\u001f]/g, function (a) {
					return String.fromCharCode(0x2400 + a.charCodeAt(0));
				});

			var from = 0, to = 0;
			var limit = 65536;
			while ((to = v.indexOf('\n', from)) >= 0) {
				appendRow.call(this, v.substring(from, to));
				from = to + 1;
				limit--;
				if (limit <= 0) {
					throw new RangeError('Editor#value(set): exceeded the limit');
				}
			}

			appendRow.call(this, v.substring(from));
		},
		set selectionStart (v) {
			if (typeof v == 'number') {
				v = this.linearPositionToBinaryPosition(v) || new Wasavi.Position(0, 0);
			}
			if (v instanceof Wasavi.Position) {
				this._ssrow = v.row;
				this._sscol = v.col;
			}
		},
		set selectionEnd (v) {
			if (typeof v == 'number') {
				v = this.linearPositionToBinaryPosition(v) || new Wasavi.Position(0, 0);
			}
			if (v instanceof Wasavi.Position) {
				this._serow = v.row;
				this._secol = v.col;
			}
		},
		set scrollTop (v) {
			this.elm.scrollTop = v;
		},
		set scrollLeft (v) {
			this.elm.scrollLeft = v;
		}
	};
};

Wasavi.LiteralInput = class LiteralInput {
	static #PROCESSOR_LITERAL = /** @type {const} */ ('literal');
	static #PROCESSOR_CODEPOINT = /** @type {const} */ ('codepoint');

	/** @type {string} */
	value = '';
	/** @type {number} */
	radix = 10;
	/** @type {RegExp | undefined} */
	pattern;
	/** @type {string} */
	processor = '0';
	/** @type {number} */
	maxLength = 0;
	/** @type {string} */
	message = '';

	/**
	 * @param {string} c
	 * @returns {WasaviLiteralInputResult | null}
	 */
	process(c) {
		switch (this.processor) {
		case LiteralInput.#PROCESSOR_LITERAL:
			return this.process_literal(c, c.charCodeAt(0));
		case LiteralInput.#PROCESSOR_CODEPOINT:
			return this.process_codepoint(c, c.charCodeAt(0));
		default:
			return this.process_0(c, c.charCodeAt(0));
		}
	}

	/**
	 * @param {string} c
	 * @param {number} code
	 * @returns {WasaviLiteralInputResult | null}
	 */
	process_0(c, code) {
		if (code >= 48 && code <= 57) {
			this.radix = 10;
			this.pattern = /^[0-9]$/;
			this.processor = LiteralInput.#PROCESSOR_CODEPOINT;
			this.maxLength = 3;
			this.message = _('dec:');
			return this.process(c);
		}
		else if (c == 'o' || c == 'O') {
			this.radix = 8;
			this.pattern = /^[0-7]$/;
			this.processor = LiteralInput.#PROCESSOR_CODEPOINT;
			this.message = _('oct:');
			this.maxLength = 3;
		}
		else if (c == 'x' || c == 'X') {
			this.radix = 16;
			this.pattern = /^[0-9a-f]$/i;
			this.processor = LiteralInput.#PROCESSOR_CODEPOINT;
			this.message = _('hex:');
			this.maxLength = 2;
		}
		else if (c == 'u' || c == 'U') {
			this.radix = 16;
			this.pattern = /^[0-9a-f]$/i;
			this.processor = LiteralInput.#PROCESSOR_CODEPOINT;
			this.message = _('unicode hex:');
			this.maxLength = c == 'u' ? 4 : 6;
		}
		else {
			this.processor = LiteralInput.#PROCESSOR_LITERAL;
			return this.process(c);
		}
		return null;
	}

	/**
	 * @param {string} c
	 * @param {number} code
	 * @returns {WasaviLiteralInputResult | null}
	 */
	process_codepoint(c, code) {
		if (code == 27) {
			this.value = '';
			return this.getResult();
		}
		if (code == 10 || code == 13) {
			return this.getResult();
		}
		if (code == 8 && this.value.length > 0) {
			this.value = this.value.replace(/.$/, '');
			this.message = this.message.replace(/.$/, '');
			return null;
		}
		if (this.pattern?.test(c)) {
			this.value += c;
			this.message += c;
			if (this.value.length >= this.maxLength) {
				return this.getResult();
			}
		}
		else {
			return this.getResult(c);
		}
		return null;
	}

	/**
	 * @param {string} c
	 * @param {number} code
	 * @returns {WasaviLiteralInputResult}
	 */
	process_literal(c, code) {
		return {processor:this.processor, sequence:[c]};
	}

	/**
	 * @param {string} [c]
	 * @returns {WasaviLiteralInputResult}
	 */
	getResult(c) {
		/** @type {WasaviLiteralInputResult} */
		var result = {processor:this.processor};
		if (this.value != '') {
			var value = parseInt(this.value, this.radix);
			if (value < 0 || value > 0x10ffff) {
				result.error = _('Invalid codepoint.');
				return result;
			}
			result.sequence = this.#toUTF16(value);
		}
		if (c != undefined) {
			result.trail = c;
		}
		return result;
	}

	/**
	 * @param {number} cp
	 * @returns {string[]}
	 */
	#toUTF16(cp) {
		/*
		 * U+10FFFF (1 0000 1111 1111 1111 1111)
		 *           * **** HHHH HHLL LLLL LLLL
		 *
		 * high surrogate: 1101 10_11 1111 1111
		 *                         ** **HH HHHH
		 *  low surrogate: 1101 11_11 1111 1111
		 *                         LL LLLL LLLL
		 */
		var p = (cp & 0x1f0000) >> 16;
		var o = cp & 0xffff;
		return p ?
			[
				String.fromCharCode(0xd800 | ((p - 1) << 6) | ((o & 0xfc00) >> 10)),
				String.fromCharCode(0xdc00 | (o & 0x03ff))
			] :
			[
				String.fromCharCode(o)
			];
	}
};

Wasavi.InputHandler = function (appProxy) {
	this.app = appProxy;
	this.inputHeadPosition = null;
	this.count = this.countOrig = 1
	this.suffix = '';
	this.text = this.textFragment = this.stroke = '';
	this.overwritten = null;
	this.prevLengthText = [];
	this.prevLengthStroke = false;
	this.stackText = [];
	this.stackStroke = [];
};
Wasavi.InputHandler.prototype = {
	dispose: function () {
		this.app = this.inputHeadPosition = null;
	},
	reset: function (count, suffix, position, initStartPosition) {
		this.inputHeadPosition = position || null;
		this.count = this.countOrig = count || 1;
		this.suffix = suffix || '';
		this.text = this.textFragment = this.stroke = '';
		this.overwritten = null;
		initStartPosition && this.setStartPosition(this.inputHeadPosition);
	},
	close: function () {
		this.flush();
		this.reset();
	},
	newState: function (position) {
		this.flush();
		this.inputHeadPosition = position || null;
		this.text = this.textFragment = this.stroke = '';
		this.overwritten = null;
		this.app.editLogger.close();
		this.app.editLogger.open('log-editing');
	},
	setStartPosition: function (pos) {
		var p = pos.clone();
		if (p.row == 0 && p.col == 0) {
			p.col--;
		}
		else {
			p = this.app.buffer.leftClusterPos(p);
		}
		this.app.marks.setInputOriginMark(p);
	},
	getStartPosition: function () {
		var p = this.app.marks.getInputOriginMark();
		if (p) {
			p = p.clone();
			if (p.col < 0) {
				p.col = 0;
			}
			else {
				p = this.app.buffer.rightClusterPos(p);
			}
		}
		return p;
	},
	invalidateHeadPosition: function () {
		this.inputHeadPosition = null;
	},
	pushText: function () {
		this.stackText.push([
			this.text.length, this.textFragment.length,
			this.prevLengthText[0], this.prevLengthText[1]
		]);
	},
	popText: function () {
		if (this.stackText.length == 0) {
			throw new Error('popText: stackText is empty.');
		}
		var o = this.stackText.pop();
		this.text = this.text.substring(0, o[0]);
		this.textFragment = this.textFragment.substring(0, o[1]);
		this.prevLengthText[0] = o[2];
		this.prevLengthText[1] = o[3];
	},
	appendText: function (e) {
		var result;
		if (isString(e)) {
			result = e;
		}
		else if (this.app.keyManager.isInputEvent(e)) {
			result = e.code == 0x000d ? '\u000a' : e.code2letter(e.code);
		}
		else {
			return;
		}
		this.prevLengthText[0] = this.text.length;
		this.prevLengthText[1] = this.textFragment.length;
		this.text += result;
		this.textFragment += result;
		return result;
	},
	ungetText: function () {
		let t = this.text;
		let tf = this.textFragment;
		if (this.prevLengthText[0] !== undefined) {
			this.text = this.text.substring(0, this.prevLengthText[0]);
			this.prevLengthText[0] -= t.length - this.prevLengthText[0];
		}
		if (this.prevLengthText[1] !== undefined) {
			this.textFragment = this.textFragment.substring(0, this.prevLengthText[1]);
			this.prevLengthText[1] -= tf.length - this.prevLengthText[1];
		}
	},
	pushStroke: function () {
		this.stackStroke.push([
			this.stroke.length, this.prevLengthStroke
		]);
	},
	popStroke: function () {
		if (this.stackStroke.length == 0) {
			throw new Error('popStroke: stackStroke is empty.');
		}
		var o = this.stackStroke.pop();
		this.stroke = this.stroke.substring(0, o[0]);
		this.prevLengthStroke = o[1];
	},
	appendStroke: function (e) {
		var result;
		if (isString(e)) {
			result = e;
		}
		else if (this.app.keyManager.isInputEvent(e)) {
			if (e.code == 0x0d) {
				result = '\u000a';
			}
			else if (/^<.+>$/.test(e.key)) {
				result = '\ue000' + e.key;
			}
			else {
				result = e.key;
			}
		}
		else {
			return;
		}
		this.prevLengthStroke = this.stroke.length;
		this.stroke += result;
		return result;
	},
	ungetStroke: function () {
		if (this.prevLengthStroke !== undefined) {
			this.stroke = this.stroke.substring(0, this.prevLengthStroke);
		}
	},
	updateHeadPosition: function () {
		if (this.inputHeadPosition === null) {
			this.inputHeadPosition = this.app.buffer.selectionStart;
		}
		return this.inputHeadPosition;
	},
	updateOverwritten: function () {
		if (this.overwritten === null) {
			this.overwritten = this.app.buffer.rows(this.app.buffer.selectionStartRow);
		}
		return this.overwritten;
	},
	flush: function () {
		function resolveEscape (s) {
			var result = s;
			result = result.replace(/\u0016[\s\S]|[\s\S]/g, function (a) {
				return a.charAt(a.length == 2 ? 1 : 0);
			});
			//result = result.replace(/[\u0008\u007f]/g, '');
			return result;
		}
		var s;
		if (this.textFragment.length && (s = resolveEscape(this.textFragment)).length) {
			if (this.app.inputMode == 'edit') {
				this.app.editLogger.write(
					Wasavi.EditLogger.ITEM_TYPE.INSERT,
					this.inputHeadPosition, s
				);
			}
			else {
				this.overwritten !== null && this.app.editLogger.write(
					Wasavi.EditLogger.ITEM_TYPE.OVERWRITE,
					this.inputHeadPosition, s, this.overwritten
				);
				this.overwritten = null;
			}
			this.textFragment = '';
		}
	}
};

Wasavi.Completer = function (appProxy, alist) {

	function CompleteItem (patterns, index, onRequestCandidates, opts) {
		this.candidates = null;
		this.candidatesFiltered = null;
		this.currentIndex = -1;
		this.prefix = false;
		this.lastLoad = 0;
		this.lastInvert = null;

		this.patterns = patterns instanceof Array ? patterns : [patterns];
		this.index = index;
		this.onRequestCandidates = onRequestCandidates;
		this.ttlMsecs = 0;

		if (opts) {
			if ('onFoundContext' in opts) {
				this.onFoundContext = opts.onFoundContext;
			}
			if ('onSetPrefix' in opts) {
				this.onSetPrefix = opts.onSetPrefix;
			}
			if ('onComplete' in opts) {
				this.onComplete = opts.onComplete;
			}
			if ('ttlSecs' in opts) {
				this.ttlMsecs = (opts.ttlSecs || 0) * 1000;
			}
			if ('isVolatile' in opts) {
				this.isVolatile = !!opts.isVolatile;
			}
		}
	}
	CompleteItem.prototype = {
		get isCandidatesAvailable () {
			return this.candidates !== null
				&& (this.ttlMsecs == 0 || Date.now() - this.lastLoad < this.ttlMsecs);
		},

		//
		reset: function () {
			this.prefix = false;
			if (this.isVolatile) {
				this.candidates = null;
			}
		},
		prev: function () {
			return this.next(true);
		},
		next: function (invert) {
			var index;
			var result;

			if (!this.candidates) {
				return result;
			}
			if (!this.candidatesFiltered) {
				this.candidatesFiltered = this.updateFilteredCandidates();
			}
			if (!this.candidatesFiltered || this.candidatesFiltered.length == 0) {
				return result;
			}
			if (this.currentIndex < 0 || this.currentIndex >= this.candidatesFiltered.length) {
				this.currentIndex = this.findIndex();
			}

			invert = !!invert;
			if (typeof this.lastInvert == 'boolean' && this.lastInvert != invert) {
				this.currentIndex = (
					this.currentIndex +
					(invert ? this.candidatesFiltered.length - 2 : 2)
				) % this.candidatesFiltered.length;
			}

			index = this.currentIndex;
			result = this.candidatesFiltered[this.currentIndex];

			this.currentIndex = (
				this.currentIndex +
				(invert ? this.candidatesFiltered.length - 1 : 1)
			) % this.candidatesFiltered.length;

			this.lastInvert = invert;

			return {
				index:index,
				piece:result
			};
		},

		//
		findIndex: function () {
			var result = 0;
			for (var i = 0, goal = this.candidatesFiltered.length; i < goal; i++) {
				if (this.candidatesFiltered[i].indexOf(this.prefix) == 0) {
					result = i;
					break;
				}
			}
			return result;
		},
		setPrefix: function (prefix, force) {
			if (this.prefix === false || force) {
				if (this.onSetPrefix) {
					var tmp = this.onSetPrefix(prefix);
					if (typeof tmp == 'string') {
						prefix = tmp;
					}
				}
				this.prefix = prefix;
				this.currentIndex = -1;
				this.candidatesFiltered = null;
			}
		},
		updateFilteredCandidates: function () {
			return this.candidates.filter(function (a) {
				return a.indexOf(this.prefix) == 0;
			}, this);
		},
		requestCandidates: function (value, callback) {
			function initCandidates (candidates) {
				var saved = {
					candidates:this.candidates,
					currentIndex:this.currentIndex,
					lastLoad:this.lastLoad
				};

				this.candidates = candidates;
				this.currentIndex = -1;
				this.lastLoad = Date.now();

				if (!callback()) {
					this.candidates = saved.candidates;
					this.currentIndex = saved.currentIndex;
					this.lastLoad = saved.lastLoad;
				}
			}
			if (typeof this.onRequestCandidates == 'function') {
				this.onRequestCandidates(this.prefix, initCandidates.bind(this), value);
			}
			else {
				initCandidates.call(this, []);
			}
		}
	};

	function CompleteContext (item, pos, offset, pieceIndex, subPieceIndex, pieces, subPieces) {
		this.item = item;
		this.pos = pos;
		this.offset = offset;
		this.pieceIndex = pieceIndex;
		this.subPieceIndex = subPieceIndex;
		this.pieces = pieces;
		this.subPieces = subPieces;

		this.item.setPrefix(this.subPieces[this.subPieceIndex].substring(0, this.offset));
	}
	CompleteContext.prototype = {
		getResult: function (invert) {
			var completedPiece = this.item.next(invert);
			if (this.item.onComplete) {
				var tmp = this.item.onComplete(
					completedPiece ? completedPiece.piece : '',
					this.subPieces[this.subPieceIndex]
				);
				if (typeof tmp == 'string') {
					this.item.currentIndex = -1;
					this.item.setPrefix(tmp, true);
					completedPiece = this.item.next(invert);
				}
			}

			if (!completedPiece) {
				return false;
			}

			var subPieces = this.subPieces.slice(1);
			var pos = this.pos - this.offset + completedPiece.piece.length;

			subPieces[this.subPieceIndex - 1] = completedPiece.piece;
			this.offset = completedPiece.piece.length;

			var pieces = this.pieces.slice(0);
			pieces[this.pieceIndex] = subPieces.join('');

			return {
				pos:pos,
				value:pieces.join('|'),
				length:this.item.candidates.length,
				filteredLength:this.item.candidatesFiltered.length,
				completed:completedPiece
			}
		}
	};

	const COMPLETION_NOTIFY_TTL_SECS = 60;
	const COMPLETION_NOTIFY_DELAY_SECS = 0.1;
	const TIMEOUT_SECS = 30;

	var list;
	var running = false;
	var notifierTimer;
	var timeoutTimer;

	// privates
	function init (alist) {
		list = (alist || []).map(function (arg) {
			var o = Object.create(CompleteItem.prototype);
			return CompleteItem.apply(o, arg) || o;
		});
	}
	function getExCommandParseResult (value) {
		var result = [];

		do {
			if (/^\s"/.test(value)) {
				result.push({range:'', rest:value});
				break;
			}

			/*
			 * range :=
			 *     address? (delimiter address?)*
			 *
			 * address :=
			 *     main-address offset?
			 *
			 * main-address :=
			 *     .
			 *     $
			 *     \d+
			 *     '[a-z`']
			 *     / ... /
			 *     ? ... ?
			 *     [+-]\d*
			 *
			 * offset :=
			 *     [+-]\d*
			 *
			 * delimiter :=
			 *     ,
			 *     ;
			 */
			var range = /^(?:\s*(?:\.|\$|\d+|'[a-z`']|\/(?:\\\/|[^\/])*\/|\?(?:\\\?|[^\?])*\?|[+\-]\d*)(?:[+\-]\d*)?)?(?:(?:\s*[,;])(?:\s*(?:\.|\$|\d+|'[a-z`']|\/(?:\\\/|[^\/])*\/|\?(?:\\\?|[^\?])*\?|[+\-]\d*)(?:[+\-]\d*)?)?)*\s*/.exec(value);
			value = value.substring(range[0].length);

			/*
			 * rest
			 */
			var rest = /^(?:\\\||[^\|])*/.exec(value);
			value = value.substring(rest[0].length);
			result.push({range:range[0], rest:rest[0]});
			if (value.charAt(0) == '|') {
				value = value.substring(1);
				value == '' && result.push({range:'', rest:''});
			}
		} while (value.length);

		return result;
	}
	function findCompleteContext (value, pos) {
		var result = null, errorMessage = null;
		var commands = getExCommandParseResult(value);

		list.some(function (item) {
			var offset = 0;
			var pieces = [];

			commands.forEach(function (command) {
				var args = command.range + command.rest;
				pieces.push(args);

				var argsForMatch = multiply(' ', command.range.length) + command.rest;

				item.patterns.forEach(function (pattern) {
					var re = pattern.exec(argsForMatch);
					if (!re) return;

					re[1] = command.range;

					var subOffset = offset;
					for (var i = 1; i < re.length; subOffset += re[i++].length) {
						if (re[i] == undefined) re[i] = '';
						if (i != item.index || result) continue;
						if (!(subOffset <= pos && pos <= subOffset + re[i].length)) continue;

						if (item.onFoundContext) {
							var a = item.onFoundContext(re[i], pos - subOffset);
							a.subPieces.unshift(i, 1);
							re.splice.apply(re, a.subPieces);
							result = new CompleteContext(
								item, pos, a.cursorOffset,
								pieces.length - 1, i + a.subPieceIndex,
								pieces, re
							);
						}
						else {
							result = new CompleteContext(
								item, pos, pos - subOffset,
								pieces.length - 1, i,
								pieces, re
							);
						}
					}
					offset += args.length + 1;
				});
			});

			return !!result || errorMessage != null;
		});

		return errorMessage || result;
	}
	function startNotifierTimer (callback) {
		stopNotifierTimer();

		notifierTimer = setTimeout(function () {
			notifierTimer = null;
			appProxy.notifier.show(_('completing...'), 1000 * COMPLETION_NOTIFY_TTL_SECS);
		}, 1000 * COMPLETION_NOTIFY_DELAY_SECS);

		timeoutTimer = setTimeout(function () {
			timeoutTimer = null;
			stopNotifierTimer();
			appProxy.keyManager.unlock();
			appProxy.low.notifyActivity('', '', 'completion timed out');
			running = false;
			callback(_('completion timed out'));
			callback.__timed_out__ = true;
		}, 1000 * TIMEOUT_SECS);
	}
	function stopNotifierTimer () {
		if (notifierTimer) {
			clearTimeout(notifierTimer);
			notifierTimer = null;
		}
		if (timeoutTimer) {
			clearTimeout(timeoutTimer);
			timeoutTimer = null;
		}
	}

	// publics
	function add (patterns, index, handler) {
		list.push(new CompleteItem(patterns, index, handler));
		return this;
	}
	function reset () {
		list.forEach(function (item) {
			item.reset();
		});
	}
	function run (value, pos, invert, callback) {
		if (running) {
			callback();
			return;
		}

		var ctx = findCompleteContext(value, pos);
		if (typeof ctx == 'string') {
			callback(ctx);
			return;
		}
		else if (!ctx) {
			callback();
			return;
		}

		if (ctx.item.isCandidatesAvailable) {
			callback(ctx.getResult(invert));
			return;
		}

		running = true;
		startNotifierTimer(callback);
		ctx.item.requestCandidates(value, function () {
			stopNotifierTimer();
			running = false;
			if (callback.__timed_out__) {
				return false;
			}
			else {
				callback(ctx.getResult(invert));
				return true;
			}
		});
	}
	function dispose () {
		appProxy = list = null;
	}

	publish(this,
		add, reset, run, dispose,
		{
			running:function () {return running}
		}
	);
	init(alist);
};

/** @typedef {{ strokes: string } & Record<string, unknown>} StrokeItem */

Wasavi.StrokeRecorder = class {
	/** @type {Record<string, StrokeItem>} */
	#storage = {};

	/**
	 * @param {string} key
	 * @param {Record<string, unknown>} [opts]
	 * @returns {StrokeItem}
	 */
	add(key, opts) {
		return this.#storage[key] = extend({strokes:''}, opts ?? {});
	}

	/**
	 * @param {string} key
	 * @returns {void}
	 */
	remove(key) {
		delete this.#storage[key];
	}

	/**
	 * @param {string} key
	 * @returns {StrokeItem | null}
	 */
	items(key) {
		return key in this.#storage ? this.#storage[key] : null;
	}

	/**
	 * @param {string} stroke
	 * @returns {void}
	 */
	appendStroke(stroke) {
		for (var i in this.#storage) {
			this.#storage[i].strokes += stroke;
		}
	}

	/** @returns {string} */
	dump() {
		return JSON.stringify(this.#storage, null, ' ');
	}
};

Wasavi.Surrounding = class Surrounding {
	static #charwiseTagPrefix = /^[<Tt]$/;
	static #linewiseTagPrefix = /^(?:[\u0014,]|<A-T>)$/;
	static #singleCharsTable = /** @type {const} */ ('!#$%&*+,\\-.:;=?@^_|~"\'`');

	static #basicTable = /** @type {const} */ ({
		'a':'<>',
		'b':'()',
		'B':'{  }',
		'r':'[]',
		't':'<>',
		'[':'[  ]',
		']':'[]',
		'{':'{  }',
		'}':'{}',
		'(':'(  )',
		')':'()'
	});

	static #insertionTable = /** @type {const} */ ({
		'p':['\n', '\n\n'],
		's':[' ', ''],
		':':[':', '']
	});

	/** @type {WasaviApp} */
	#app;

	/** @param {WasaviApp} app */
	constructor(app) {
		this.#app = app;
	}

	/*
	 * private methods
	 */

	/**
	 * @param {unknown} item
	 * @returns {[string, string]}
	 */
	#getPair(item) {
		var head = '', tail = '';
		if (isString(item)) {
			head = item.substr(0, Math.floor(item.length / 2));
			tail = item.substr(Math.floor(item.length / 2));
		}
		else if (isArray(item)) {
			head = String(item[0] ?? '');
			tail = String(item[1] ?? '');
		}
		else if (isObject(item)) {
			head = String(item.head ?? '');
			tail = String(item.tail ?? '');
		}
		return [head, tail];
	}

	/**
	 * @param {string} id
	 * @returns {[string, string]}
	 */
	#getPairFromId(id) {
		if (isKeyOf(Surrounding.#basicTable, id)) {
			return this.#getPair(Surrounding.#basicTable[id]);
		}
		if (Surrounding.#singleCharsTable.indexOf(id) >= 0) {
			return [id, id];
		}
		return ['', ''];
	}

	/**
	 * @param {string} s
	 * @returns {[string, string]}
	 */
	#getPairFromString(s) {
		var head = '', tail = '', extra = '';
		var re;
		if (/^ .+/.test(s)) {
			s = s.substring(1);
			extra = ' ';
		}
		if ((re = /^<([^ >]*)([^>]*)>$/.exec(s))) {
			head = re[0];
			tail = '</' + re[1] + '>';
		}
		else if (isKeyOf(Surrounding.#insertionTable, s)) {
			[head, tail] = this.#getPair(Surrounding.#insertionTable[s]);
		}
		else {
			[head, tail] = this.#getPairFromId(s);
		}

		if (extra != '' && (head != '' || tail != '')) {
			head = (head + ' ').replace(/ +$/, ' ');
			tail = (' ' + tail).replace(/^ +/, ' ');
		}

		return [head, tail];
	}

	/**
	 * @param {string} id
	 * @returns {WasaviSurroundingPositions | false}
	 */
	#getPositions(id) {
		var pair = this.#getPairFromId(id);

		if (pair[0] == '' && pair[1] == '') {
			return false;
		}

		if (id == 'r') {
			id = '[';
		}
		else if (id == 'a') {
			id = '<';
		}

		var buffer = this.#app.buffer;
		var outerStart, outerEnd;
		var innerStart, innerEnd;

		// range symbol
		if ('"\'`[]{}<>()Bbt'.indexOf(id) >= 0) {
			var ss = buffer.selectionStart;

			// <a href="...">content</a>
			// ^             ^      ^   ^
			// |             |      |   +---- outerEnd
			// |             |      +-------- innerEnd
			// |             +--------------- innerStart
			// +----------------------------- outerStart

			// inner positions
			if (!this.#app.searchUtils.dispatchRangeSymbol(1, id)) {
				buffer.setSelectionRange(ss);
				return false;
			}
			innerStart = buffer.selectionStart;
			innerEnd = buffer.selectionEnd;

			// outer positions
			if (!this.#app.searchUtils.dispatchRangeSymbol(1, id, true)) {
				buffer.setSelectionRange(ss);
				return false;
			}
			outerStart = buffer.selectionStart;
			outerEnd = buffer.selectionEnd;

			// adjust the outerStart
			while (outerStart.col < innerStart.col) {
				if (!spc('S').test(buffer.charAt(outerStart))) {
					break;
				}
				outerStart.col++;
			}

			// adjust the outerEnd
			while (outerEnd.col - 1 > innerEnd.col) {
				outerEnd.col--;
				if (!spc('S').test(buffer.charAt(outerEnd))) {
					outerEnd.col++;
					break;
				}
			}
		}

		// simple one char
		else {
			var ss = buffer.selectionStart;
			var range = this.#app.searchUtils.findQuoteRange(buffer.rows(ss), ss.col, id);
			if (!range) {
				return false;
			}

			outerStart = new Wasavi.Position(ss.row, range.start);
			innerStart = new Wasavi.Position(ss.row, range.start + 1);
			innerEnd = new Wasavi.Position(ss.row, range.end);
			outerEnd = new Wasavi.Position(ss.row, range.end + 1);
		}

		return {
			outerStart: outerStart,
			innerStart: innerStart,
			innerEnd: innerEnd,
			outerEnd: outerEnd
		};
	}

	/** @param {[string, string]} pair */
	#doInsertAsCharwise(pair) {
		const mark = 'surround-right';
		var buffer = this.#app.buffer;
		var ss = buffer.selectionStart;
		var se = buffer.selectionEnd;

		buffer.isLineOrientSelection = false;

		// mark the position of right item
		this.#app.marks.setPrivate(mark, se.clone());

		// insert left item
		buffer.setSelectionRange(ss);
		this.#app.edit.insert(pair[0]);

		// insert right item
		buffer.setSelectionRange(this.#app.marks.getPrivate(mark));
		this.#app.edit.insert(pair[1]);

		// locate a cursor on the left item
		buffer.setSelectionRange(ss);
		this.#app.marks.setPrivate(mark);
	}

	/** @param {[string, string]} pair */
	#doInsertAsLinewise(pair) {
		const mark = 'surround-left';
		var buffer = this.#app.buffer;
		var ss = buffer.selectionStart;
		var se = buffer.selectionEnd;
		var indent = this.#app.config.vars.autoindent ?
			buffer.getIndent(buffer.selectionStart) : '';

		buffer.isLineOrientSelection = false;

		// mark the position of left item
		this.#app.marks.setPrivate(mark, ss.clone());

		// insert right item
		buffer.setSelectionRange(se);
		this.#app.edit.insert('\n' + indent + pair[1].replace(spc('^S+'), ''));

		// insert left item
		var content = buffer.rows(ss);
		buffer.setSelectionRange(
			new Wasavi.Position(ss.row, 0),
			new Wasavi.Position(ss.row, (/^[ \t]*/.exec(content)?.[0] ?? '').length));
		this.#app.edit.insert(indent + pair[0].replace(spc('S+$'), '') + '\n');

		// shift right the inner contents
		var indentExpanded = indent;
		var regex = /^\t+/;
		var re = regex.exec(indent);
		if (re) {
			indentExpanded = indentExpanded.replace(
				regex,
				multiply(' ', re[0].length * this.#app.config.vars.tabstop));
		}
		var shiftCount = Math.floor(indentExpanded.length / this.#app.config.vars.shiftwidth);
		buffer.setSelectionRange(this.#app.marks.getPrivate(mark));
		this.#app.edit.shift(se.row - ss.row + 1, shiftCount + 1);

		// locate a cursor on the left item
		buffer.setSelectionRange(ss);
		this.#app.marks.setPrivate(mark);
	}

	/**
	 * @param {WasaviPosition} outerStart
	 * @param {WasaviPosition} innerStart
	 * @param {WasaviPosition} innerEnd
	 * @param {WasaviPosition} outerEnd
	 */
	#doRemoveSingleLine(outerStart, innerStart, innerEnd, outerEnd) {
		var buffer = this.#app.buffer;

		buffer.isLineOrientSelection = false;

		// delete left item
		buffer.setSelectionRange(outerStart, innerStart);
		this.#app.edit.deleteSelection();

		// delete right item
		innerEnd.col -= innerStart.col - outerStart.col;
		outerEnd.col -= innerStart.col - outerStart.col;
		buffer.setSelectionRange(innerEnd, outerEnd);
		this.#app.edit.deleteSelection();

		// locate a cursor on the left item
		buffer.setSelectionRange(outerStart);
	}

	/**
	 * @param {WasaviPosition} outerStart
	 * @param {WasaviPosition} innerStart
	 * @param {WasaviPosition} innerEnd
	 * @param {WasaviPosition} outerEnd
	 */
	#doRemoveMultiLine(outerStart, innerStart, innerEnd, outerEnd) {
		var buffer = this.#app.buffer;

		buffer.isLineOrientSelection = false;

		var line = buffer.rows(outerStart);
		var indent = spc('^S*').exec(line)?.[0] ?? '';
		var mid = outerStart.clone();

		// left item
		if (spc('^S*$').test(line.substring(0, outerStart.col))
		&&  spc('^S*$').test(line.substring(innerStart.col))) {
			// orphan, delete a whole line
			buffer.isLineOrientSelection = true;
			buffer.setSelectionRange(
				new Wasavi.Position(outerStart.row, 0),
				new Wasavi.Position(outerStart.row, line.length + 1));
			this.#app.edit.deleteSelection();
			buffer.isLineOrientSelection = false;

			innerEnd.row--;
			outerEnd.row--;
		}
		else {
			// not a orphan, delete left item and trailing spaces
			// ....{....zzz
			//     ^^^^^

			while (spc('^S$').test(line.charAt(innerStart.col))) {
				innerStart.col++;
			}
			buffer.setSelectionRange(outerStart, innerStart);
			this.#app.edit.deleteSelection();

			mid.row++;
		}

		// middle block
		while (mid.row < outerEnd.row) {
			var re = spc('^S*').exec(buffer.rows(mid));

			buffer.setSelectionRange(
				new Wasavi.Position(mid.row, 0),
				new Wasavi.Position(mid.row, (re?.[0] ?? '').length));
			this.#app.edit.insert(indent);

			mid.row++;
		}

		// right item
		var lineEnd = buffer.rows(outerEnd);
		if (spc('^S*$').test(lineEnd.substring(0, innerEnd.col))
		&&  spc('^S*$').test(lineEnd.substring(outerEnd.col))) {
			// orphan, delete a whole line
			buffer.isLineOrientSelection = true;
			buffer.setSelectionRange(
				new Wasavi.Position(outerEnd.row, 0),
				new Wasavi.Position(outerEnd.row, lineEnd.length + 1));
			this.#app.edit.deleteSelection();
			buffer.isLineOrientSelection = false;
		}
		else {
			// not a orphan, delete leading spaces and right item
			// zzz....}....
			//    ^^^^^

			while (innerEnd.col > 0 && spc('^S$').test(lineEnd.charAt(innerEnd.col - 1))) {
				innerEnd.col--;
			}
			buffer.setSelectionRange(innerEnd, outerEnd);
			this.#app.edit.deleteSelection();
		}

		// locate a cursor on the left item
		buffer.setSelectionRange(outerStart);
	}

	/**
	 * @param {[string, string]} pair
	 * @param {WasaviPosition} outerStart
	 * @param {WasaviPosition} innerStart
	 * @param {WasaviPosition} innerEnd
	 * @param {WasaviPosition} outerEnd
	 */
	#doReplace(pair, outerStart, innerStart, innerEnd, outerEnd) {
		var buffer = this.#app.buffer;
		var ss, se;
		const mark = 'surround-right';

		buffer.isLineOrientSelection = false;

		// mark the position of right item
		this.#app.marks.setPrivate(mark + '-1', innerEnd.clone());
		this.#app.marks.setPrivate(mark + '-2', outerEnd.clone());

		// replace left item
		ss = outerStart;
		se = innerStart;
		buffer.setSelectionRange(ss, se);
		if (spc('^S*$').test(buffer.rows(se).substring(se.col))) {
			pair[0] = pair[0].replace(spc('S*$'), '');
		}
		this.#app.edit.insert(pair[0]);

		// replace right item
		ss = this.#app.marks.getPrivate(mark + '-1');
		se = this.#app.marks.getPrivate(mark + '-2');
		buffer.setSelectionRange(ss, se);
		if (ss != null && spc('^S*$').test(buffer.rows(ss).substring(0, ss.col))) {
			pair[1] = pair[1].replace(spc('^S*'), '');
		}
		this.#app.edit.insert(pair[1]);

		// locate a cursor on the left item
		buffer.setSelectionRange(outerStart);
		this.#app.marks.setPrivate(mark + '-1');
		this.#app.marks.setPrivate(mark + '-2');
	}

	/*
	 * public methods
	 */

	/**
	 * @param {string} s
	 * @param {boolean} [isLineOrient]
	 * @returns {boolean}
	 */
	insert(s, isLineOrient) {
		var pair = this.#getPairFromString(s);
		if (pair[0] == '' && pair[1] == '') {
			return false;
		}

		this.#app.editLogger.open('surround', () => {
			(isLineOrient ? this.#doInsertAsLinewise : this.#doInsertAsCharwise).call(this, pair);
		});

		return true;
	}

	/**
	 * @param {string} id
	 * @returns {boolean}
	 */
	remove(id) {
		const p = this.#getPositions(id);
		if (!p) {
			return false;
		}

		this.#app.editLogger.open('desurround', () => {
			(p.outerStart.row == p.outerEnd.row ? this.#doRemoveSingleLine : this.#doRemoveMultiLine).call(
				this, p.outerStart, p.innerStart, p.innerEnd, p.outerEnd
			);
		});

		return true;
	}

	/**
	 * @param {string} id
	 * @param {string} s
	 * @returns {boolean}
	 */
	replace(id, s) {
		const p = this.#getPositions(id);
		if (!p) {
			return false;
		}

		var pair = this.#getPairFromString(s);
		if (pair[0] == '' && pair[1] == '') {
			return false;
		}

		this.#app.editLogger.open('resurround', () => {
			this.#doReplace(pair, p.outerStart, p.innerStart, p.innerEnd, p.outerEnd);
		});

		return true;
	}

	/**
	 * @param {string} line
	 * @returns {boolean}
	 */
	isCharwiseTagPrefix(line) {
		return Surrounding.#charwiseTagPrefix.test(line);
	}

	/**
	 * @param {string} line
	 * @returns {boolean}
	 */
	isLinewiseTagPrefix(line) {
		return Surrounding.#linewiseTagPrefix.test(line);
	}

	/**
	 * @param {string} line
	 * @returns {boolean}
	 */
	isTagPrefix(line) {
		return this.isCharwiseTagPrefix(line) || this.isLinewiseTagPrefix(line);
	}
};

Wasavi.IncDec = class IncDec {
	static #UPPER_ALPHABET = /** @type {const} */ ('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
	static #LOWER_ALPHABET = /** @type {const} */ ('abcdefghijklmnopqrstuvwxyz');

	static #FORMAT_ALPHA = /** @type {const} */ ('alpha');
	static #FORMAT_BIN = /** @type {const} */ ('bin');
	static #FORMAT_HEX = /** @type {const} */ ('hex');
	static #FORMAT_OCTAL = /** @type {const} */ ('octal');
	static #FORMAT_DECIMAL = /** @type {const} */ ('decimal');
	static #FORMAT_DEFAULT =
		/** @type {const} */ (`${IncDec.#FORMAT_BIN},${IncDec.#FORMAT_OCTAL},${IncDec.#FORMAT_HEX}`);

	static #PATTERN_ALPHA = /** @type {const} */ ('(\\b[a-zA-Z]\\b)');
	static #PATTERN_BIN = /** @type {const} */ ('(0b[01]+)');
	static #PATTERN_HEX = /** @type {const} */ ('(0[xX][0-9a-fA-F]+)');
	static #PATTERN_OCTAL = /** @type {const} */ ('(0[0-9]*)');
	static #PATTERN_DECIMAL = /** @type {const} */ ('(-?[0-9]+)');

	/** @type {WasaviApp} */
	#app;
	/** @type {WasaviIncDecOpts | undefined} */
	#defaultOpts;
	/** @type {Record<WasaviIncDecFormat, (result: WasaviIncDecResult, item: WasaviIncDecItem, count: number) => void>} */
	#replaceMap;

	/**
	 * @param {WasaviApp} app
	 * @param {WasaviIncDecOpts} [defaultOpts]
	 */
	constructor(app, defaultOpts) {
		this.#app = app;
		this.#defaultOpts = defaultOpts;
		this.#replaceMap = {
			[IncDec.#FORMAT_ALPHA]: this.#getAlphabetReplacement,
			[IncDec.#FORMAT_BIN]: this.#getBinaryReplacement,
			[IncDec.#FORMAT_HEX]: this.#getHexReplacement,
			[IncDec.#FORMAT_OCTAL]: this.#getOctalReplacement,
			[IncDec.#FORMAT_DECIMAL]: this.#getDecimalReplacement
		};
	}

	/**
	 * @param {WasaviIncDecResult} result
	 * @param {WasaviIncDecItem} item
	 * @param {number} count
	 */
	#getAlphabetReplacement(result, item, count) {
		const alphabet = /[a-z]/.test(item.text) ? IncDec.#LOWER_ALPHABET : IncDec.#UPPER_ALPHABET;
		const alphabetIndex = item.text.charCodeAt(0) - alphabet.charCodeAt(0);

		count %= alphabet.length;

		if (count < 0) {
			result.replacement = alphabet.charAt((alphabetIndex + alphabet.length + count) % alphabet.length);
		}
		else {
			result.replacement = alphabet.charAt((alphabetIndex + count) % alphabet.length);
		}
	}

	/**
	 * @param {WasaviIncDecResult} result
	 * @param {WasaviIncDecItem} item
	 * @param {number} count
	 */
	#getBinaryReplacement(result, item, count) {
		const radix = 2;
		const headerLength = 2; // length of '0b'
		const originalLength = item.text.length - headerLength;

		var value = new Uint32Array([parseInt(item.text.substring(headerLength), radix) + count])[0].toString(radix);

		if (value.length < originalLength) {
			value = (multiply('0', originalLength) + value).substr(-originalLength);
		}

		result.replacement = item.text.substring(0, headerLength) + value;
	}

	/**
	 * @param {WasaviIncDecResult} result
	 * @param {WasaviIncDecItem} item
	 * @param {number} count
	 */
	#getHexReplacement(result, item, count) {
		const radix = 16;
		const headerLength = 2; // length of '0x' or '0X'
		const originalLength = item.text.length - headerLength;

		var value = new Uint32Array([parseInt(item.text.substring(headerLength), radix) + count])[0].toString(radix);

		if (value.length < originalLength) {
			value = (multiply('0', originalLength) + value).substr(-originalLength);
		}

		const reversed = item.text.substring(headerLength).split('').reverse().join('');
		var re = /[a-fA-F]/.exec(reversed);
		if (re) {
			value = /[a-f]/.test(re[0]) ? value.toLowerCase() : value.toUpperCase();
		}
		else {
			value = /^.x/.test(item.text) ? value.toLowerCase() : value.toUpperCase();
		}

		result.replacement = item.text.substring(0, headerLength) + value;
	}

	/**
	 * @param {WasaviIncDecResult} result
	 * @param {WasaviIncDecItem} item
	 * @param {number} count
	 */
	#getOctalReplacement(result, item, count) {
		const radix = 8;
		const headerLength = 1; // length of '0'
		const originalLength = item.text.length - headerLength;

		var value = new Uint32Array([parseInt(item.text.substring(headerLength), radix) + count])[0].toString(radix);

		if (value.length < originalLength) {
			value = (multiply('0', originalLength) + value).substr(-originalLength);
		}

		result.replacement = item.text.substring(0, headerLength) + value;
	}

	/**
	 * @param {WasaviIncDecResult} result
	 * @param {WasaviIncDecItem} item
	 * @param {number} count
	 */
	#getDecimalReplacement(result, item, count) {
		const radix = 10;

		var value = new Int32Array([parseInt(item.text, radix) + count])[0].toString(radix);

		result.replacement = value;
	}

	/**
	 * @param {string} s
	 * @param {number} pos
	 * @param {WasaviIncDecOpts} [opts]
	 * @returns {WasaviIncDecMatches}
	 */
	extractTargets(s, pos, opts) {
		/** @type {Set<string>} */
		var optsHash = new Set;
		var patterns = [];
		var patternIndex = 1;
		/** @type {WasaviIncDecFormat[]} */
		var patternIndices = [];
		/** @type {WasaviIncDecMatches} */
		var matches = Object.assign([], {foundIndex: -1});
		var pattern, re;

		if (opts == undefined) {
			opts = this.#defaultOpts ?? {
				firstReturn: false,
				formats: IncDec.#FORMAT_DEFAULT
			};
		}

		var formats = opts.formats ?? IncDec.#FORMAT_DEFAULT;

		formats.split(',').forEach(a => optsHash.add(a.replace(/^\s+|\s+$/g, '')));

		if (optsHash.has('alpha')) {
			patterns.push(IncDec.#PATTERN_ALPHA);
			patternIndices[patternIndex++] = IncDec.#FORMAT_ALPHA;
		}
		if (optsHash.has('bin')) {
			patterns.push(IncDec.#PATTERN_BIN);
			patternIndices[patternIndex++] = IncDec.#FORMAT_BIN;
		}
		if (optsHash.has('hex')) {
			patterns.push(IncDec.#PATTERN_HEX);
			patternIndices[patternIndex++] = IncDec.#FORMAT_HEX;
		}
		if (optsHash.has('octal')) {
			patterns.push(IncDec.#PATTERN_OCTAL);
			patternIndices[patternIndex++] = IncDec.#FORMAT_OCTAL;
		}

		patterns.push(IncDec.#PATTERN_DECIMAL);
		patternIndices[patternIndex++] = IncDec.#FORMAT_DECIMAL;

		pattern = new RegExp(patterns.join('|'), 'g');

		while ((re = pattern.exec(s))) {
			/** @type {WasaviIncDecItem} */
			var item = {
				text: '',
				index: -1,
				match: false
			};

			for (var i = 1, goal = re.length; i < goal; i++) {
				if (re[i] != undefined) {
					item.text = re[i];
					item.index = re.index;
					item.type = patternIndices[i];
					if (item.type == IncDec.#FORMAT_OCTAL && /[89]/.test(item.text)) {
						item.type = IncDec.#FORMAT_DECIMAL;
					}
					break;
				}
			}

			if (re.index <= pos && pos < re.index + re[0].length) {
				item.match = true;
				matches.foundIndex = matches.length;
			}

			matches.push(item);

			if (opts.firstReturn && item.match) {
				break;
			}
		}

		return matches;
	}

	/**
	 * @param {WasaviIncDecMatches} matches
	 * @param {number} count
	 * @returns {WasaviIncDecResult | null}
	 */
	getReplacement(matches, count) {
		var foundIndex = matches.foundIndex;

		if (typeof foundIndex != 'number') {
			throw new TypeError('incdec#getReplacement: foundIndex is not a number');
		}

		if (foundIndex < 0 || matches.length <= foundIndex) {
			return null;
		}

		var item = matches[foundIndex];
		var result = {
			index: item.index,
			text: item.text,
			replacement: item.text
		};

		if (item.type != null && item.type in this.#replaceMap) {
			if (count) {
				this.#replaceMap[item.type](result, item, count);
			}
		}
		else {
			throw new TypeError(`incdec#getReplacement: unknown type ${item.type}`);
		}

		return result;
	}

	/**
	 * @param {WasaviIncDecMatches} matches
	 * @param {number} count
	 * @returns {WasaviIncDecResult[]}
	 */
	getAllReplacements(matches, count) {
		var oldFoundIndex = matches.foundIndex;
		/** @type {WasaviIncDecResult[]} */
		var result = [];

		try {
			for (var i = 0, goal = matches.length; i < goal; i++) {
				matches.foundIndex = i;
				var rep = this.getReplacement(matches, count);
				if (rep) {
					result.push(rep);
				}
			}
		}
		finally {
			matches.foundIndex = oldFoundIndex;
		}

		return result;
	}

	/**
	 * @param {WasaviIncDecResult} rep
	 */
	applyReplacement(rep) {
		var buffer = this.#app.buffer;
		var editor = this.#app.edit;
		var n = new Wasavi.Position(buffer.selectionStartRow, rep.index);

		buffer.isLineOrientSelection = false;
		buffer.setSelectionRange(n);

		if (rep.replacement.length == rep.text.length) {
			editor.overwrite(rep.replacement);
		}
		else if (rep.replacement.length > rep.text.length) {
			editor.overwrite(rep.replacement.substring(0, rep.text.length));
			editor.insert(rep.replacement.substring(rep.text.length));
		}
		else {
			editor.overwrite(rep.replacement);
			buffer.setSelectionRange(
				buffer.selectionStart,
				buffer.offsetBy(
					buffer.selectionStart, rep.text.length - rep.replacement.length));
			editor.deleteSelection();
		}
	}
};

/**
 * @typedef {object} SortOpts
 * @property {boolean} force
 * @property {boolean} ignoreCase
 * @property {boolean} reuse
 * @property {boolean} column
 * @property {number} columnNumber
 * @property {string | null} pattern
 */

Wasavi.SortWorker = class {
	/** @type {string[] | null} */
	content = null;
	/** @type {SortOpts | null} */
	opts = null;
	/**
	 * @param {WasaviApp} app
	 * @param {WasaviEditor} t
	 * @param {WasaviExCommandArg} a
	 */
	constructor(app, t, a) {
		this.app = app;
		this.t = t;
		this.a = a;
		this.terminalType = 0;
		this.rows = 0;
	}
	/**
	 * @param {string[]} content
	 * @param {string} key
	 * @param {RegExp | null | undefined} regex
	 * @param {SortOpts} opts
	 * @returns {string[]}
	 */
	dosort(content, key, regex, opts) {
		/** @type {Record<string, (a: string, b: string) => number>} */
		var callbacks = {
			i(a, b) {
				return a.toLowerCase().localeCompare(b.toLowerCase());
			},

			p(a, b) {
				var re = regex?.exec(a);
				if (re) {
					a = a.substring(re.index + re[0].length);
				}
				var re = regex?.exec(b);
				if (re) {
					b = b.substring(re.index + re[0].length);
				}
				return a.localeCompare(b);
			},
			pr(a, b) {
				var re = regex?.exec(a);
				if (re) {
					a = re[0];
				}
				var re = regex?.exec(b);
				if (re) {
					b = re[0];
				}
				return a.localeCompare(b);
			},
			pi(a, b) {
				var re = regex?.exec(a);
				if (re) {
					a = a.substring(re.index + re[0].length);
				}
				var re = regex?.exec(b);
				if (re) {
					b = b.substring(re.index + re[0].length);
				}
				return a.toLowerCase().localeCompare(b.toLowerCase());
			},
			pri(a, b) {
				var re = regex?.exec(a);
				if (re) {
					a = re[0];
				}
				var re = regex?.exec(b);
				if (re) {
					b = re[0];
				}
				return a.toLowerCase().localeCompare(b.toLowerCase());
			},

			c(a, b) {
				// TODO: expand tab?
				a = a.substring(opts.columnNumber);
				b = b.substring(opts.columnNumber);
				return a.localeCompare(b);
			},
			ci(a, b) {
				a = a.substring(opts.columnNumber);
				b = b.substring(opts.columnNumber);
				return a.toLowerCase().localeCompare(b.toLowerCase());
			}
		};
		return content.sort(callbacks[key]);
	}
	/**
	 * @param {number} type
	 * @param {string} content
	 * @returns {string}
	 */
	preSort(type, content) {
		switch (type) {
		case 1:
			content = content.replace(/\\\n/g, '\n');

			/** @type {Record<string, number>} */
			var spaces = {'\t':0, ' ':0};
			content.replace(spc('(S)\\n', 'g'), function (/** @type {string} */ $0, /** @type {string} */ s) {
				spaces[s]++;
				return $0;
			});

			var maxValueKey = Object.keys(spaces).reduce(function (v, key) {
				return spaces[key] > spaces[v] ? key : v
			});

			if (spaces[maxValueKey] > 0) {
				content = content.replace(spc('S$'), '');
				content += maxValueKey;
			}
			break;
		case 2:
			content = content.replace(/,\n/g, '\n');
			break;
		}
		return content;
	}
	/**
	 * @param {number} type
	 * @param {string} content
	 * @returns {string}
	 */
	postSort(type, content) {
		switch (type) {
		case 1:
			content = content
				.replace(/\n/g, '\\\n')
				.replace(/\s*$/, '');
			break;
		case 2:
			content = content.replace(/\n/g, ',\n');
			break;
		}
		return content;
	}

	/**
	 * @param {string} [arg]
	 * @returns {string | true}
	 */
	parseArgs(arg) {
		var re;
		var s = arg != undefined ? arg : this.a.argv[0];
		/** @type {SortOpts} */
		var opts = {
			force:!!this.a.flags.force,
			ignoreCase:false,
			reuse:false,
			column:false,
			columnNumber:-1,
			pattern:null
		};
		while ((s = s.replace(spc('^S+'), '')) != '') {
			if ((re = /^i/.exec(s))) {
				opts.ignoreCase = true;
				s = s.substring(re[0].length);
			}
			else if ((re = /^r/.exec(s))) {
				opts.reuse = true;
				s = s.substring(re[0].length);
			}
			else if ((re = /^c([0-9]+)/.exec(s))) {
				opts.column = true;
				opts.columnNumber = parseInt(re[1], 10);
				s = s.substring(re[0].length);
			}
			else if (/^[^a-zA-Z0-9"\n\\|]/.test(s)) {
				var d = s.charAt(0);
				s = s.substring(1);
				re = /** @type {RegExpExecArray} */ ((new RegExp('(?:\\\\.|[^' + d + '])*')).exec(s));
				opts.pattern = re[0].replace(new RegExp('\\\\' + d, 'g'), d);
				s = s.substring(re[0].length + 1);
				if (opts.pattern == '') {
					if ((opts.pattern = this.app.lastRegexFindCommand.pattern || '') == '') {
						return _('No previous search pattern.');
					}
				}
			}
			else {
				return _('Unknown sort argument: {0}', s);
			}
		}
		this.opts = opts;
		return true;
	}
	/**
	 * @param {string} [content]
	 * @returns {string | true}
	 */
	buildContent(content) {
		if (!content) {
			content = this.t.getValue(this.a.range[0], this.a.range[1], '\n');
		}

		content = trimTerm(content);
		var re = content.match(/\n/g);
		if (!re) return _('Single line can not be sorted.');
		this.rows = re.length + 1;

		var trailEscapes = (content.match(/\\\n/g) || []).length;
		var trailCommas = (content.match(/,\n/g) || []).length;
		if (trailEscapes == this.rows - 1) {
			this.terminalType = 1;
		}
		else if (trailCommas == this.rows - 1) {
			this.terminalType = 2;
		}
		else {
			this.terminalType = 0;
		}

		this.content = this.preSort(this.terminalType, content).split('\n');
		return true;
	}
	/** @returns {string | true} */
	sort() {
		var opts = /** @type {SortOpts} */ (this.opts);
		/** @type {string[]} */
		var front = [];
		/** @type {string[]} */
		var content = this.content ?? [];

		if (opts.pattern || opts.reuse || opts.ignoreCase || opts.column) {
			/** @type {RegExp | null | undefined} */
			var regex;
			var key = '', end = /** @type {string[]} */ ([]);
			if (opts.pattern) {
				regex = this.app.low.getFindRegex({
					pattern:opts.pattern,
					csOverride:opts.ignoreCase ? 'i' : '',
					globalOverride:'',
					multilineOverride:''
				});
				if (!regex) {
					return _('Invalid regex pattern.');
				}
				key += 'p';
				if (opts.reuse) {
					key += 'r';
				}
				while (content.length) {
					var line = content.shift() ?? '';
					(regex.test(line) ? end : front).push(line);
				}
				content = end;
			}
			else if (opts.column) {
				key += 'c';
			}

			if (opts.ignoreCase) {
				key += 'i';
			}

			content = this.dosort(content, key, regex, opts);
		}
		else {
			content = content.sort();
		}

		if (front.length) {
			content = front.concat(content);
		}
		if (opts.force) {
			content = content.reverse();
		}

		this.content = content;
		return true;
	}
	/** @returns {string} */
	getContent() {
		var result = this.content?.join('\n') ?? '';
		this.content = null;
		result = this.postSort(this.terminalType, result) + '\n';
		return result;
	}
};

})(typeof globalThis == 'object' ? globalThis : window);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
