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

/*
 * prototype extension
 * ----------------
 */

Object.defineProperties(Array.prototype, {
	firstItem: {
		get:function () {return this[0]},
		set:function (v) {
			if (this.length) {
				this[0] = v;
			}
		}
	},
	lastItem: {
		get:function () {return this[this.length - 1]},
		set:function (v) {
			if (this.length) {
				this[this.length - 1] = v;
			}
		}
	}
});

/*
 * utility functions
 * ----------------
 */

// DOM manipulators
/**
 * @param {string | HTMLElement} arg
 * @returns {HTMLElement | null}
 */
g.$ = function (arg) {
	return typeof arg == 'string' ? document.getElementById(arg) : arg;
};
/** @returns {number} */
g.docScrollLeft = function () {
	return Math.max(document.documentElement.scrollLeft, document.body.scrollLeft);
};
/** @returns {number} */
g.docScrollTop = function () {
	return Math.max(document.documentElement.scrollTop, document.body.scrollTop);
};
/** @returns {number} */
g.docScrollWidth = function () {
	return Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
};
/** @returns {number} */
g.docScrollHeight = function () {
	return Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
};
/** @returns {number} */
g.docClientWidth = function () {
	return Math.min(document.documentElement.clientWidth, document.body.clientWidth)
};
/** @returns {number} */
g.docClientHeight = function () {
	return Math.min(document.documentElement.clientHeight, document.body.clientHeight)
};
/** @param {string | HTMLElement} node */
g.emptyNodeContents = function (node) {
	var elm = $(node);
	if (!elm) return;
	var r = document.createRange();
	r.selectNodeContents(elm);
	r.deleteContents();
};
g.removeChild = function () {
	for (var i = 0; i < arguments.length; i++) {
		var elm = $(arguments[i]);
		elm && elm.parentNode && elm.parentNode.removeChild(elm);
	}
};
/**
 * @param {{nodeName: string}} target
 * @returns {boolean}
 */
g.isMultilineTextInput = function (target) {
	return target.nodeName != 'INPUT';
};
/**
 * @param {HTMLElement} src
 * @param {Record<string, string>} styles
 */
g.style = function (src, styles) {
	var dest = /** @type {Record<string, string>} */ (/** @type {unknown} */ (src.style));
	for (var i in styles) {
		dest[i] = styles[i];
	}
};

// simple functions
g.$call = function () {
	for (var i = 0, goal = arguments.length; i < goal; i++) {
		typeof arguments[i] == 'function' && arguments[i]();
	}
};
/**
 * @template {object} T
 * @template {object} U
 * @param {T} dest
 * @param {U} src
 * @returns {T & U}
 */
g.extend = function (dest, src) {
	// shallow merge: cannot be statically proven to yield T & U
	var d = /** @type {Record<string, unknown>} */ (dest);
	var s = /** @type {Record<string, unknown>} */ (src);
	for (var p in s) {
		d[p] = s[p];
	}
	return /** @type {T & U} */ (dest);
};
/**
 * @template {object} T
 * @param {T} target
 * @param {string} key
 * @returns {key is keyof T}
 */
g.isKeyOf = function (target, key) {
	return Object.keys(target).includes(key);
};
/**
 * @param {Node | null} node
 * @returns {node is Text}
 */
g.isTextNode = function (node) {
	return node?.nodeType === Node.TEXT_NODE;
};
/**
 * @param {Node | null} node
 * @returns {node is Element}
 */
g.isElementNode = function (node) {
	return node?.nodeType === Node.ELEMENT_NODE;
};
/**
 * @param {string} src
 * @returns {unknown}
 */
g.parseJson = function (src) {
	/** @type {unknown} */
	var result;
	try {
		result = JSON.parse(src);
	}
	catch (e) {
		result = null;
	}
	return result;
};
/**
 * @param {Record<string, string>} o
 * @returns {Record<string, string>}
 */
g.reverseObject = function (o) {
	/** @type {Record<string, string>} */
	var result = {};
	for (var i in o) {result[o[i]] = i;}
	return result;
};
/**
 * @param {string} letter
 * @param {number} times
 * @returns {string}
 */
g.multiply = function (letter, times) {
	if (letter == '' || times <= 0) return '';
	var result = letter;
	while (result.length < times) {
		result += result;
	}
	return result.length == times ? result : result.substring(0, letter.length * times);
};
/**
 * @param {unknown} s
 * @returns {string}
 */
g.toVisibleString = function (s) {
	// treat falsy values as empty string
	if (s === false
	||  s === null
	||  s === undefined
	||  (typeof s == 'number' && isNaN(s))) {
		return '';
	}

	// treat array as special string
	if (s instanceof Array) {
		if (s.length > 10) {
			s = s.slice(0, 10).join(', ') + '...';
		}
		else {
			s = s.join(', ');
		}
	}

	// treat object as empty string
	else if (typeof s == 'object') {
		if ('toString' in s && typeof s.toString == 'function') {
			s = s.toString();
		}
		if (/^\[object\s+[^\]]+\]$/.test(String(s))) {
			return '';
		}
	}

	var str = '' + s;
	return str
		.replace(/[\u0000-\u001f]/g, a => '^' + String.fromCharCode(a.charCodeAt(0) + 64))
		.replace(/\u007f/g, '^_')
		.replace(/\ue000/g, '');
};
/**
 * @param {string | number} s
 * @returns {string}
 */
g.toVisibleControl = function (s) {
	return typeof s == 'number' ?
		_toVisibleControl(s) :
		(s || '').replace(/[\u0000-\u001f\u007f]/g, function (a) {
			return _toVisibleControl(a.charCodeAt(0));
		});
};
/**
 * @param {string | number} s
 * @returns {string}
 */
g.toNativeControl = function (s) {
	return typeof s == 'number' ?
		_toNativeControl(s) :
		(s || '').replace(/[\u2400-\u241f\u2421]/g, function (a) {
			return _toNativeControl(a.charCodeAt(0));
		});
};
/**
 * @param {number} code
 * @returns {string}
 */
g._toVisibleControl = function (code) {
	// U+2400 - U+243F: Unicode Control Pictures
	if (code == 0x7f) {
		return String.fromCharCode(0x2421);
	}
	if (code >= 0x00 && code <= 0x1f) {
		return String.fromCharCode(0x2400 + code);
	}
	return String.fromCharCode(code);
};
/**
 * @param {number} code
 * @returns {string}
 */
g._toNativeControl = function (code) {
	if (code == 0x2421) {
		return '\u007f';
	}
	if (code >= 0x2400 && code <= 0x241f) {
		return String.fromCharCode(code & 0x00ff);
	}
	return String.fromCharCode(code);
};
/**
 * @param {string} s
 * @param {string} [ch]
 * @returns {string}
 */
g.trimTerm = function (s, ch) {
	ch || (ch = '\n');
	if (s.length && s.substr(-1) == ch) {
		s = s.substring(0, s.length - 1);
	}
	return s;
};
/**
 * @param {unknown} a
 * @returns {string}
 */
g.getObjectType = function (a) {
    return Object.prototype.toString.call(a).replace(/^\[object\s+|\]$/g, '');
};
/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
g.isObject = function (value) {
	return getObjectType(value) == 'Object';
};
/**
 * @param {unknown} value
 * @returns {value is string}
 */
g.isString = function (value) {
	return getObjectType(value) == 'String';
};
/**
 * @param {unknown} value
 * @returns {value is number}
 */
g.isNumber = function (value) {
	return getObjectType(value) == 'Number';
};
/**
 * @param {unknown} value
 * @returns {value is boolean}
 */
g.isBoolean = function (value) {
	return getObjectType(value) == 'Boolean';
};
/**
 * @param {unknown} value
 * @returns {value is unknown[]}
 */
g.isArray = function (value) {
	// TODO: accept ducktyping?
	return getObjectType(value) == 'Array';
};
/**
 * @param {unknown} value
 * @returns {value is Function}
 */
g.isFunction = function (value) {
	return getObjectType(value) == 'Function';
};
/**
 * @param {unknown} value
 * @returns {value is GeneratorFunction}
 */
g.isGenerator = function (value) {
	return getObjectType(value) == 'GeneratorFunction';
};
/**
 * @template T
 * @param {ArrayLike<T>} arg
 * @param {number} [index]
 * @returns {T[]}
 */
g.toArray = function (arg, index) {
	return Array.prototype.slice.call(arg, index || 0);
};
/**
 * @param {number} min
 * @param {number} value
 * @param {number} max
 * @returns {number}
 */
g.minmax = function (min, value, max) {
	return Math.max(min, Math.min(value, max));
};
/**
 * @param {string} s
 * @returns {string}
 */
g.getLiteralRegexp = function (s) {
	return s.replace(/[.+*?(){}]/g, '\\$&');
};

// a bit complicated functions
/** @returns {string} */
g._ = function () {
	/** @type {unknown[]} */
	var args = toArray(arguments);
	// declared signature guarantees the first argument is the format string
	var format = /** @type {string} */ (args.shift());
	return format.replace(/\{(?:([a-z]+):)?(\d+)\}/ig, function ($0, baseWord, index) {
		if (baseWord == undefined || baseWord == '') {
			return toVisibleString(args[index]);
		}
		// simple plural fix for english
		if (args[index] == 1) {
			return baseWord;
		}
		if (/[hos]$/.test(baseWord)) {
			return baseWord + 'es';
		}
		if (/[^aeiou]y$/i.test(baseWord)) {
			return baseWord.substr(0, baseWord.length - 1) + 'ies';
		}
		return baseWord + 's';
	});
};
g.publish = function () {
	if (arguments.length < 1) return;
	var target = arguments[0];
	for (var i = 1; i < arguments.length; i++) {
		switch (getObjectType(arguments[i])) {
		case 'Function':
			Object.defineProperty(target, arguments[i].name, {
				value:arguments[i],
				configurable:false,
				enumerable:true,
				writable:false
			});
			break;

		case 'Object':
			for (var j in arguments[i]) {
				switch (getObjectType(arguments[i][j])) {
				case 'Function':
					Object.defineProperty(target, j, {
						get:arguments[i][j],
						configurable:false,
						enumerable:true
					});
					break;
				case 'Array':
					Object.defineProperty(target, j, {
						get:arguments[i][j][0],
						set:arguments[i][j][1],
						configurable:false,
						enumerable:true
					});
					break;
				default:
					Object.defineProperty(target, j, {
						value:arguments[i][j],
						configurable:false,
						enumerable:true,
						writable:false
					});
					break;
				}
			}
			break;
		}
	}
};
/**
 * @param {string} source
 * @returns {{ result: number } | { error: string } | {}}
 */
g.expr = function (source) {
	/** @type {string[]} */
	var tokens = [];
	var i = 0;

	/** @returns {number} */
	function add () {
		var r = mul();
loop:	while (true) {
			switch (tokens[i++]) {
			case '+': r += mul(); break;
			case '-': r -= mul(); break;
			default: --i; break loop;
			}
		}
		return r;
	}
	/** @returns {number} */
	function mul () {
		var r = fact();
loop:	while (true) {
			switch (tokens[i++]) {
			case '*': r *= fact(); break;
			case '/': r /= fact(); break;
			case '%': r %= fact(); break;
			default: --i; break loop;
			}
		}
		return r;
	}
	/** @returns {number} */
	function fact () {
		var token = tokens[i++];
		/** @type {number} */
		var r;
		if (token == '(') {
			r = add();
			if (tokens[i++] != ')') {
				throw new SyntaxError(_('Missing ")".'));
			}
		}
		else {
			var sign = '';
			if (/^0x/.test(token)) {
				r = parseInt(token.substring(2), 16);
			}
			else if (/^0[0-7]+/.test(token)) {
				r = parseInt(token, 8);
			}
			else if (/^0b/.test(token)) {
				r = parseInt(token.substring(2).replace(/_/g, ''), 2);
			}
			else {
				if (token == '+' || token == '-') {
					sign = token;
					token = tokens[i++];
				}
				r = parseFloat(sign + token);
			}
			if (isNaN(r)) {
				throw new SyntaxError(_('Missing a number.'));
			}
		}
		return r;
	}

	try {
		const regex = /[()+\-*\/%]|0x[0-9a-f]+|0b[01_]+|0[0-7]+|(?:0|[1-9][0-9]*)\.[0-9]*(?:e[+-]?[0-9]+)*|\.[0-9]+(?:e[+-]?[0-9]+)*|(?:0|[1-9][0-9]*)(?:e[+-]?[0-9]+)*/gi;
		var re, restIndex = -1;

		while ((re = regex.exec(source))) {
			tokens.push(re[0]);
			restIndex = re.index + re[0].length;
		}

		if (restIndex >= 0) {
			source = source.substring(restIndex);
		}

		source = source.replace(/^\s+/, '');

		if (source != '') {
			throw new SyntaxError(_('Invalid token: {0}', source.charAt(0)));
		}
		if (tokens.length == 0) {
			return {};
		}

		var result = add();
		if (i < tokens.length) {
			throw new SyntaxError(_('Extra token: {0}', tokens[i].charAt(0)));
		}
		return {result: result};
	}
	catch (e) {
		return {error: e instanceof Error ? e.message : String(e)};
	}
};
g.strftime = (function () {
	/** @typedef {string | string[] | undefined} Locale */
	/** @typedef {(s: string, w: number, key?: string) => string} NumFormatter */
	/** @typedef {(s: string, format: string, key: string) => string} StrFormatter */
	/** @typedef {(d: Date, l: Locale, f: string, w?: number) => string} Translator */

	const weekdays = {
		long:'Sunday Monday Tuesday Wednesday Thursday Friday Saturday'.split(' '),
		short:'Sun Mon Tue Wed Thu Fri Sat'.split(' ')
	};
	const months = {
		long:'January February March April May June July August September October November December'.split(' '),
		short:'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')
	};
	/** @type {Record<string, NumFormatter>} */
	const nummap = {
		'_':function (s,w) {return s.length < w ? (multiply(' ', w) + s).substr(-w) : s},
		'-':function (s,w) {return s.replace(/^[ 0]+/, '') || '0'},
		'0':function (s,w) {return s.length < w ? (multiply('0', w) + s).substr(-w) : s}
	};
	/** @type {Record<string, StrFormatter>} */
	const strmap = {
		'^':function (s, format, key) {
			// make the behavior the same as mysterious glibc strftime: P is not capitalized
			if (key == 'P') {
				return s;
			}
			return s.toUpperCase();
		},
		'#':function (s, format, key) {
			if ('aAbBh'.indexOf(key) >= 0) {
				return s.toUpperCase();
			}
			else if ('pPZ'.indexOf(key) >= 0) {
				return s.toLowerCase();
			}
			return s;
		}
	};
	/** @type {Record<string, Translator>} */
	const translators = {
		'%':function () {return '%'},
		a:function (d,l,f,w) {return ff(Intl.DateTimeFormat(l, {weekday:'short'}).format(d), f)},
		A:function (d,l,f,w) {return ff(Intl.DateTimeFormat(l, {weekday:'long'}).format(d), f)},
		b:function (d,l,f,w) {return ff(Intl.DateTimeFormat(l, {month:'short'}).format(d), f)},
		B:function (d,l,f,w) {return ff(Intl.DateTimeFormat(l, {month:'long'}).format(d), f)},
		c:function (d,l,f,w) {return ff(d.toLocaleString(l), f)},
		C:function (d,l,f,w) {return ff(d.getFullYear().toString().substring(0, 2), fixformat(f, '0'), w)},
		d:function (d,l,f,w) {return ff(d.getDate(), fixformat(f, '0'), w || 2)},
		D:function (d,l,f,w) {
			return 'mdy'.split('')
				.map(/** @this {Record<string, Translator>} */ function(a){return this[a](d, l, a + f.substring(1))}, this)
				.join('/');
		},
		e:function (d,l,f,w) {return ff(d.getDate(), fixformat(f, '_'), w || 2)},
		F:function (d,l,f,w) {
			return 'Ymd'.split('')
				.map(/** @this {Record<string, Translator>} */ function(a){return this[a](d, l, a + f.substring(1))}, this)
				.join('-');
		},
		g:function (d,l,f,w) {
			return ff((parseInt(this.G(d, l, 'G-', 0), 10)) % 100, fixformat(f, '0'), w || 2)
		},
		G:function (d,l,f,w) {
			var y = d.getFullYear();
			var V = parseInt(this.V(d, l, 'V-', 0), 10);
			var W = parseInt(this.W(d, l, 'W-', 0), 10);
			if (W > V) y++;
			else if (W == 0 && V >= 52) y--;
			return ff(y, fixformat(f, '0'), w || 4);
		},
		h:function (d,l,f,w) {return this.b(d,l,f,w)},
		H:function (d,l,f,w) {return ff(d.getHours(), fixformat(f, '0'), w || 2)},
		I:function (d,l,f,w) {return ff(d.getHours() % 12, fixformat(f, '0'), w || 2)},
		j:function (d,l,f,w) {return ff((Math.ceil((d.getTime() - (new Date(d.getFullYear(), 0, 1)).getTime()) / (24 * 60 * 60 * 1000))), fixformat(f, '0'), w || 3)},
		k:function (d,l,f,w) {return ff(d.getHours(), fixformat(f, '_'), w || 2)},
		l:function (d,l,f,w) {return ff(d.getHours() % 12, fixformat(f, '_'), w || 2)},
		m:function (d,l,f,w) {return ff(d.getMonth() + 1, fixformat(f, '0'), w || 2)},
		M:function (d,l,f,w) {return ff(d.getMinutes(), fixformat(f, '0'), w || 2)},
		n:function (d,l,f,w) {return '\n'},
		p:function (d,l,f,w) {return ff(d.getHours() < 12 ? 'AM' : 'PM', f)},
		P:function (d,l,f,w) {return ff(this.p(d, l, f, w).toLowerCase(), f)},
		r:function (d,l,f,w) {return [this.I(d, l, 'I', 0), ':', this.M(d, l, 'M', 0), ':', this.S(d, l, 'S', 0), ' ', this.p(d, l, 'p', 0)].join('')},
		R:function (d,l,f,w) {
			return 'HM'.split('')
				.map(/** @this {Record<string, Translator>} */ function(a){return this[a](d, l, a + f.substring(1))}, this)
				.join(':');
		},
		s:function (d,l,f,w) {return ff(Math.floor(d.getTime() / 1000), fixformat(f, '-'), 0)},
		S:function (d,l,f,w) {return ff(d.getSeconds(), fixformat(f, '0'), w || 2)},
		t:function (d,l,f,w) {return '\t'},
		T:function (d,l,f,w) {
			return 'HMS'.split('')
				.map(/** @this {Record<string, Translator>} */ function(a){return this[a](d, l, a + f.substring(1))}, this)
				.join(':');
		},
		u:function (d,l,f,w) {return ff(d.getDay() == 0 ? 7 : d.getDay(), fixformat(f, '0'), w || 0)},
		U:function (d,l,f,w) {return ff(Math.floor(((parseInt(this.j(d, l, 'j-', 0), 10)) + (6 - d.getDay())) / 7), fixformat(f, '0'), w || 2)},
		V:function (d,l,f,w) {
			var woy = parseInt(this.W(d, l, 'W-', 0), 10);
			var dow1_1 = (new Date('' + d.getFullYear() + '/1/1')).getDay();
			/** @type {number | string} */
			var idow = woy + (dow1_1 > 4 || dow1_1 <= 1 ? 0 : 1);
			if (idow == 53 && (new Date('' + d.getFullYear() + '/12/31')).getDay() < 4) {
				idow = 1;
			}
			else if (idow === 0) {
				idow = this.V(new Date('' + (d.getFullYear() - 1) + '/12/31'), l, 'V-', 0);
			}
			return ff(idow, fixformat(f, '0'), w || 2);
		},
		w:function (d,l,f,w) {return ff(d.getDay(), fixformat(f, '0'), w || 1)},
		W:function (d,l,f,w) {return ff(parseInt('' + (((parseInt(this.j(d, l, 'j-', 0), 10)) + (7 - Number(this.u(d, l, 'u-', 0)))) / 7), 10), fixformat(f, '0'), w || 2)},
		x:function (d,l,f,w) {return ff(d.toLocaleDateString(l, {year:'2-digit', month:'2-digit', day:'2-digit'}), f)},
		X:function (d,l,f,w) {return ff(d.toLocaleTimeString(l, {hour:'2-digit', minute:'2-digit', second:'2-digit'}), f)},
		y:function (d,l,f,w) {return ff(d.getFullYear() % 100, fixformat(f, '0'), w || 2)},
		Y:function (d,l,f,w) {return ff(d.getFullYear(), fixformat(f, '0'), w || 4)},
		z:function (d,l,f,w) {
			var t = d.getTimezoneOffset();
			var sign = t < 0 ? '+' : '-';
			t = Math.abs(t);
			return sign + ('00' + Math.floor(t / 60)).substr(-2) + ('00' + (t % 60)).substr(-2);
		},
		Z:function (d,l,f,w) {
			var formatted = Intl.DateTimeFormat(l, {year:'numeric', timeZoneName:'long'}).format(d);
			var parts = formatted.split(/,\s*/);
			if (parts.length == 1) return ff(parts[0], f);

			var result = parts[1].split(/\s+/).map(unit => unit.charAt(0)).join('');

			return ff(result, f);
		}
	}
	/**
	 * @param {string} format
	 * @param {string} def
	 * @returns {string}
	 */
	function fixformat (format, def) {
		var f = format.substring(1).replace(/[^_\-0^#]/g, '');
		return f == '' ? format.charAt(0) + def : format;
	}
	/**
	 * @param {string | number} s
	 * @param {string} format
	 * @param {number} [width]
	 * @returns {string}
	 */
	function ff (s, format, width) {
		var key = format.charAt(0);
		var str = '' + s;
		format = format.substring(1);
		if (isNumber(width) && width > 1 && /^\d+$/.test(str) && format in nummap) {
			str = nummap[format](str, width, key);
		}
		else if (format in strmap) {
			str = strmap[format](str, format, key);
		}
		return str;
	}
	/** @returns {string | false} */
	function strftime () {
		var format = arguments[0];
		var datetime = arguments[1] || new Date;
		/** @type {Locale} */
		var locale;
		if (!isString(format)) return false;
		if (!(datetime instanceof Date)) return false;
		return format
			.replace(/%\{locale:([^}]+)\}/g, function ($0, alocale) {
				if (locale == undefined) {
					locale = alocale;
				}
				else if (isArray(locale)) {
					locale.push(alocale);
				}
				else {
					locale = [locale];
					locale.push(alocale);
				}
				return '';
			})
			.replace(/%([_\-0^#]?)(\d*)(.)/g, function ($0, f, w, key) {
				try {
					return key in translators ?
						translators[key](datetime, locale, key + f, parseInt(w, 10) || 0) :
						key;
				}
				catch (e) {
					return $0;
				}
			});
	}
	return strftime;
})();
/**
 * @template {unknown[]} Args
 * @template T
 * @param {(...args: Args) => Generator<unknown, T, unknown>} generatorFn
 * @param {unknown} thisObj
 * @param {Args} args
 * @returns {Promise<T>}
 */
g.execGenerator = function (generatorFn, thisObj, ...args) {
	if (!isGenerator(generatorFn)) {
		throw new TypeError('execGenerator: first argument is not a generator');
	}

	return new Promise((resolve, reject) => {
		/** @param {unknown} [value] */
		function next (value) {
			run(generator.next, value);
		}

		/** @param {unknown} error */
		function raise (error) {
			run(generator.throw, error);
		}

		/**
		 * @param {(this: Generator<unknown, T, unknown>, arg: unknown) => IteratorResult<unknown, T>} f
		 * @param {unknown} a
		 */
		function run (f, a) {
			/** @type {IteratorResult<unknown, T>} */
			var result;
			try {
				result = f.call(generator, a);
			}
			catch (ex) {
				reject(ex);
				return;
			}

			if (result.done) {
				resolve(result.value);
				return;
			}

			if (result.value instanceof Promise) {
				result.value.then(next, raise);
			}
			else {
				next(result.value);
			}
		}

		/** @type {Generator<unknown, T, unknown>} */
		var generator = generatorFn.apply(thisObj, args);
		next();
	});
};
/**
 * @param {string} s
 * @param {string | RegExp} d
 * @param {number} num
 * @returns {string[]}
 */
g.splitex = function (s, d, num) {
	s = '' + s;
	num = num - 0;

	if (!isString(d) && !(d instanceof RegExp)) {
		throw new Error('splitex: delimiter is neither string nor RegExp');
	}
	if (!isNumber(num) || isNaN(num)) {
		throw new Error('splitex: num is not a number');
	}

	if (num < 0) return s.split(d);
	if (num == 0) return [];
	if (num == 1) return [s];

	let regex = new RegExp(isString(d) ? getLiteralRegexp(d) : d, 'g');
	/** @type {string[]} */
	let result = [];
	let from = 0;
	/** @type {RegExpExecArray | null} */
	let re = null;

	while (result.length < num && (re = regex.exec(s))) {
		result.push(s.substring(from, re.index));
		from = re.index + re[0].length;
	}

	if (result.length < num) {
		result.push(s.substring(from));
	}
	else if (re && from < s.length) {
		result.lastItem += s.substring(re.index);
	}

	while (result.length < num) {
		result.push('');
	}

	return result;
};

})(typeof globalThis == 'object' ? globalThis : window);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
