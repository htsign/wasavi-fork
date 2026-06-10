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

'use strict';

typeof WasaviExtensionWrapper != 'undefined'
&& !WasaviExtensionWrapper.urlInfo.isExternal
&& /^text\/html|^application\/xhtml/.test(document.contentType)
&& (function (g) {

// consts <<<1
const EXTENSION_SPECIFIER = 'data-texteditor-extension';
const EXTENSION_CURRENT = 'data-texteditor-extension-current';
const MARKS_ID = 'data-wasavi-marks';
const FULLSCREEN_MARGIN = 8;
const MIN_WIDTH_PIXELS = 320;
const MIN_HEIGHT_PIXELS = 240;
const BOOT_WAIT_TIMEOUT_MSECS = 1000 * 5;
const INSTANCE_MAX = 0x10000;
const ACCEPTABLE_TYPES = {
	textarea: 'enableTextArea',
	text:     'enableText',
	search:   'enableSearch',
	tel:      'enableTel',
	url:      'enableUrl',
	email:    'enableEmail',
	password: 'enablePassword',
	number:   'enableNumber',
	body:     'enablePage'
};

/**
 * @typedef {object} SiteOverrideSelector
 * @property {string} selector
 * @property {boolean | undefined} blocked
 * @property {string | undefined} setargs
 */
/**
 * @typedef {object} SiteOverrides
 * @property {SiteOverrideSelector[]} _selectors
 * @property {(element: Element) => boolean | undefined} blocked
 * @property {(element: Element) => string | undefined} setargs
 */
/**
 * @typedef {object} MarkdownAppendable
 * @property {(text: string) => void} append
 */
/**
 * @typedef {object} PseudoMutationObserver
 * @property {Element | null} element
 * @property {(target: Node, options?: MutationObserverInit) => void} observe
 * @property {() => void} disconnect
 * @property {() => string} toString
 */
/**
 * @typedef {object} MutationObserverLike
 * @property {(target: Node, options?: MutationObserverInit) => void} observe
 * @property {() => void} disconnect
 */
/**
 * @typedef {new (handler?: unknown) => MutationObserverLike} MutationObserverCtor
 */

// page global variables <<<1
var extension = WasaviExtensionWrapper.create();
var isTestFrame = /^http:\/\/127\.0\.0\.1(:\d+)?\/test_frame\.html/.test(window.location.href);
var isOptionsPage = window.location.href == /** @type {WasaviUrlInfo} */ (extension.urlInfo).optionsUrl;
/** @type {Record<string, boolean> | undefined} */
var allowedElements;
/** @type {readonly Record<string, unknown>[] | undefined} */
var shortcutCode;
/** @type {string | undefined} */
var fontFamily;
/** @type {boolean | undefined} */
var quickActivation;
/** @type {boolean | undefined} */
var devMode;
/** @type {boolean | undefined} */
var logMode;
/** @type {SiteOverrides | undefined} */
var siteOverrides;
/** @type {number | undefined} */
var statusLineHeight;
/** @type {string[] | undefined} */
var testLog;
/** @type {Record<string, Agent>} */
var wasaviAgentsHash = {};
var diag = {
	/** @type {string[] | null} */
	_messages: null,
	/** @type {number | null} */
	_lastPush: null,
	init() {
		this._messages = [];
		this._lastPush = Date.now();
		return this;
	},
	/** @param {string} s */
	push(s) {
		if (!this._messages) return;
		var now = Date.now();
		this._messages.push(((now - (this._lastPush ?? 0)) / 1000).toFixed(3) + 's\t' + s);
		this._lastPush = now;
	},
	out() {
		if (!this._messages) return;
		error(this._messages.join('\n'));
		this._messages = null;
	}
};

// utility functions <<<1
/** @param {...unknown} args */
function log(...args) {
	logMode && console.log('wasavi agent: ' + args.join(' '));
}
/** @param {...unknown} args */
function info(...args) {
	logMode && console.info('wasavi agent: ' + args.join(' '));
}
/** @param {...unknown} args */
function error(...args) {
	logMode && console.error('wasavi agent: ' + args.join(' '));
}

/**
 * @param {string | HTMLElement} id
 * @returns {HTMLElement | null}
 */
function $(id) {
	return typeof id == 'string' ? document.getElementById(id) : id;
}

/**
 * @param {...unknown} args
 * @returns {unknown[]}
 */
function _(...args) {
	return args;
}

/** @returns {string} */
function getUniqueClass() {
	var result;
	do {
		result = 'wasavi_tmp_' + Math.floor(Math.random() * 0x10000);
	} while (document.getElementsByClassName(result).length > 0);
	return result;
}

/**
 * @param {string} name
 * @param {unknown} detail
 * @param {EventTarget} [target]
 * @returns {void}
 */
function fireCustomEvent(name, detail, target) {
	var ev = document.createEvent('CustomEvent');
	ev.initCustomEvent(name, false, false, detail);
	(target || document).dispatchEvent(ev);
}

/**
 * @param {string} letter
 * @param {number} times
 * @returns {string}
 */
function multiply(letter, times) {
	if (letter == '' || times <= 0) return '';
	var result = letter;
	while (result.length < times) {
		result += result;
	}
	return result.length == times ? result : result.substring(0, letter.length * times);
}

/**
 * @param {Element | null} node
 * @returns {Element | null}
 */
function getShadowActiveElement(node) {
	// @see https://github.com/akahuku/wasavi/issues/124
	// @see http://jsbin.com/fizeger/edit?html,output
	if (!node) return null;
	for (;;) {
		/** @type {ShadowRoot | null} */
		var root = node.shadowRoot;
		if (!root) return node;

		/** @type {Element | null} */
		var inner = root.activeElement;
		if (!inner) return node;

		node = inner;
	}
}

var markDown = (function () {
	/**
	 * @typedef {(this: ToPlainText, node: Element, nodeName: string) => void} MarkdownUnitHandler
	 */
	/**
	 * @typedef {object} MarkdownOpts
	 * @property {Record<string, MarkdownUnitHandler>} [preunits]
	 * @property {Record<string, MarkdownUnitHandler>} [postunits]
	 * @property {(this: ToPlainText, self: ToPlainText) => void} [onbeforeprocess]
	 * @property {(this: ToPlainText, self: ToPlainText) => void} [onafterprocess]
	 */

	/**
	 * @param {HTMLElement} node
	 * @param {keyof CSSStyleDeclaration & string} prop
	 * @returns {string}
	 */
	function getStyle(node, prop) {
		if (node.style[prop]) return /** @type {string} */ (node.style[prop]);
		if (node.nodeName == 'SCRIPT') return 'none';
		var style = /** @type {WindowProxy} */ (node.ownerDocument.defaultView).getComputedStyle(node, '');
		return /** @type {string} */ (style[prop]);
	}

	/**
	 * @param {Node | null} node
	 * @param {Node} rootNode
	 * @returns {number}
	 */
	function getQuotedCount(node, rootNode) {
		var result = 0;
		for (; node; node = node.parentNode) {
			if (node.nodeName == 'BLOCKQUOTE') {
				result++;
			}
			if (node == rootNode) {
				break;
			}
		}
		return result;
	}

	/**
	 * @param {string} display
	 * @returns {boolean}
	 */
	function isBlock(display) {
		return 'table-row block list-item'.indexOf(display) >= 0;
	}

	/**
	 * @param {string} display
	 * @returns {boolean}
	 */
	function isForceInline(display) {
		return 'table-row'.indexOf(display) >= 0;
	}

	class Unit {
		/** @type {string[] | string} */
		text;
		/** @type {string} */
		nodeName;
		/** @type {string} */
		display;
		/** @type {string} */
		whiteSpace;
		/** @type {number} */
		quotedCount;
		/** @type {number | undefined} */
		listDepth;
		/** @type {boolean | undefined} */
		isFirstListItem;
		/** @type {boolean | undefined} */
		isLastListItem;

		/**
		 * @param {string} text
		 * @param {string} [nodeName]
		 * @param {string} [display]
		 * @param {string} [whiteSpace]
		 * @param {number} [quotedCount]
		 */
		constructor(text, nodeName, display, whiteSpace, quotedCount) {
			this.text = [text];
			this.nodeName = nodeName || '';
			this.display = display || '';
			this.whiteSpace = whiteSpace || '';
			this.quotedCount = quotedCount || 0;
		}

		/**
		 * @param {string} text
		 * @returns {void}
		 */
		append(text) {
			var buffer = /** @type {string[]} */ (this.text);
			var last = buffer.length - 1;
			if (buffer[last] == '') {
				buffer[last] = text.replace(/^\s+/, '');
			}
			else {
				var re1 = /** @type {RegExpExecArray} */ (/^(.*?)(\s*)$/.exec(buffer[last]));
				var re2 = /** @type {RegExpExecArray} */ (/^(\s*)([\s\S]*)$/.exec(text));
				buffer[last] =
					(re1[1] || '') +
					((re1[2] && re1[2].length || re2[1] && re2[1].length) ? ' ' : '') +
					(re2[2] || '').replace(/[\n\t ]+/g, ' ');
			}
		}

		/** @returns {void} */
		appendNewline() {
			/** @type {string[]} */ (this.text).push('');
		}
	}

	class ToPlainText {
		/** @type {MarkdownOpts} */
		opts;
		/** @type {Unit[]} */
		buffer;

		/** @param {MarkdownOpts} [opts] */
		constructor(opts) {
			this.opts = opts || {};
			this.buffer = [];
		}

		/** @type {Record<string, MarkdownUnitHandler>} */
		preunits = {
			a() { this.append('[') },
			b() { this.append('**') },
			br() { this.appendNewline() },
			code() { this.append('`') },
			h1(node, nodeName) { this.append(multiply('#', Number(nodeName.substring(1))) + ' ') },
			h2(node, nodeName) { this.preunits.h1.call(this, node, nodeName) },
			h3(node, nodeName) { this.preunits.h1.call(this, node, nodeName) },
			h4(node, nodeName) { this.preunits.h1.call(this, node, nodeName) },
			h5(node, nodeName) { this.preunits.h1.call(this, node, nodeName) },
			h6(node, nodeName) { this.preunits.h1.call(this, node, nodeName) },
			hr() { this.append('* * *') },
			i() { this.append('_') },
			img(node, nodeName) {
				this.append(
					'![' + (node.getAttribute('alt') || '') + ']' +
					'(' + (node.getAttribute('src') || '') + ')'
				);
			},
			li(node) {
				var parentNode = /** @type {Element} */ (node.parentNode);
				var prefix = '* ';
				var listIndex = Array.prototype.indexOf.call(parentNode.children, node);
				if (parentNode.nodeName == 'OL') {
					prefix = (listIndex + 1) + '. ';
				}
				this.append(prefix);
				this.prop('isFirstListItem', listIndex == 0);
				this.prop('isLastListItem', listIndex == parentNode.children.length - 1);

				var depth = -1;
				for (var p = node.parentNode; p; p = p.parentNode) {
					if (p.nodeName == 'OL' || p.nodeName == 'UL') {
						depth++;
					}
				}
				this.prop('listDepth', depth);
			}
		};

		/** @type {Record<string, MarkdownUnitHandler>} */
		postunits = {
			a(node) { this.append('](' + node.getAttribute('href') + ')') },
			b() { this.append('**') },
			code() { this.append('`') },
			i() { this.append('_') }
		};

		/** @returns {string} */
		dump() {
			var buffer = ['*** dump ***'];
			this.buffer.forEach(function (b, i) {
				var tmp = [
					'--- #' + i + ' ---',
					'    text: "' + /** @type {string} */ (b.text).replace(/\n/g, '\\n')
										  .replace(/\t/g, '\\t') + '"',
					' display: ' + b.display +
						', nodeName: ' + b.nodeName +
						', quotedCount: ' + b.quotedCount
				];
				if ('listDepth' in b) {
					tmp.push('listDepth: ' + b.listDepth);
				}
				if ('isFirstListItem' in b) {
					tmp.push('isFirstListItem: ' + b.isFirstListItem);
				}
				if ('isLastListItem' in b) {
					tmp.push('isLastListItem: ' + b.isLastListItem);
				}
				buffer.push.apply(buffer, tmp);
			});
			return buffer.join('\n');
		}

		/**
		 * @param {string} nodeName
		 * @param {string} display
		 * @param {string} whiteSpace
		 * @param {number} quotedCount
		 * @returns {void}
		 */
		newUnit(nodeName, display, whiteSpace, quotedCount) {
			this.buffer.push(new Unit('', nodeName, display, whiteSpace, quotedCount));
		}

		/** @returns {string} */
		getResult() {
			return this.buffer.map(function (b) {return b.text}).join('');
		}

		/**
		 * @param {string} text
		 * @returns {void}
		 */
		append(text) {
			var i = this.buffer.length - 1;
			if (i < 0) return;
			return this.buffer[i].append(text);
		}

		/** @returns {void} */
		appendNewline() {
			var i = this.buffer.length - 1;
			if (i < 0) return;
			this.buffer[i].appendNewline();
		}

		/**
		 * @param {'isFirstListItem' | 'isLastListItem' | 'listDepth'} propName
		 * @param {boolean | number} value
		 * @returns {void}
		 */
		prop(propName, value) {
			var i = this.buffer.length - 1;
			if (i < 0) return;
			var u = this.buffer[i];
			switch (propName) {
			case 'isFirstListItem':
			case 'isLastListItem':
				u[propName] = /** @type {boolean} */ (value);
				break;
			case 'listDepth':
				u[propName] = /** @type {number} */ (value);
				break;
			}
		}

		/**
		 * @param {'onbeforeprocess' | 'onafterprocess'} eventName
		 * @param {ToPlainText} self
		 * @returns {void}
		 */
		emit(eventName, self) {
			var handler = this.opts[eventName];
			if (typeof handler != 'function') return;
			try {
				handler.call(this, self);
			}
			catch (e) {}
		}

		/**
		 * @param {Node} node
		 * @param {Node} rootNode
		 * @returns {void}
		 */
		mainloop(node, rootNode) {
			var element = /** @type {HTMLElement} */ (node);
			var display = getStyle(element, 'display');
			if (display == 'none') return;

			var block = isBlock(display);
			if (block) {
				this.newUnit(
					node.nodeName,
					display,
					getStyle(element, 'whiteSpace'),
					getQuotedCount(node, rootNode)
				);
			}

			var nodeName = node.nodeName.toLowerCase();
			if (this.opts.preunits && nodeName in this.opts.preunits) {
				this.opts.preunits[nodeName].call(this, element, nodeName);
			}
			else if (nodeName in this.preunits) {
				this.preunits[nodeName].call(this, element, nodeName);
			}

			var lastUnitIndex = -1;
			for (var i = 0, goal = node.childNodes.length; i < goal; i++) {
				var c = node.childNodes[i];

				if (c.nodeType == 3) {
					var parentNode = /** @type {HTMLElement} */ (c.parentElement);
					if (lastUnitIndex >= 0 && lastUnitIndex != this.buffer.length - 1) {
						this.newUnit(
							parentNode.nodeName,
							getStyle(parentNode, 'display'),
							getStyle(parentNode, 'whiteSpace'),
							getQuotedCount(node, rootNode)
						);
					}
					this.append(c.nodeValue ?? '');
					lastUnitIndex = this.buffer.length - 1;
				}
				else {
					this.mainloop(c, rootNode);
				}
			}

			nodeName = node.nodeName.toLowerCase();
			if (this.opts.postunits && nodeName in this.opts.postunits) {
				this.opts.postunits[nodeName].call(this, element, nodeName);
			}
			else if (nodeName in this.postunits) {
				this.postunits[nodeName].call(this, element, nodeName);
			}
		}

		/** @returns {void} */
		normalize() {
			for (var i = 0, buffer = this.buffer; i < buffer.length; i++) {
				var u = buffer[i];

				u.text = /** @type {string[]} */ (u.text).join('\n');
				if (u.text.length == 0) {
					buffer.splice(i, 1);
					i--;
				}
			}

			for (var i = 0, buffer = this.buffer; i < buffer.length; i++) {
				var u = buffer[i];

				if (u.display == 'list-item') {
					u.text = multiply(' ', (u.listDepth ?? 0) * 2) + u.text;
				}

				if (u.quotedCount) {
					u.text = multiply('> ', u.quotedCount) + u.text;
				}

				if (i < buffer.length - 1) {
					var v = buffer[i + 1];
					var isLastListItem = u.display == 'list-item' && u.isLastListItem;
					var isFirstListItem = v.display == 'list-item' && v.isFirstListItem;
					if (u.display == 'block' || isLastListItem
					||  v.display == 'block' || isFirstListItem) {
						u.text = u.text +
							multiply('\n', isLastListItem && isFirstListItem ? 2 : 1) +
							multiply('> ', Math.min(u.quotedCount, v.quotedCount)) + '\n';
					}
					else {
						u.text += '\n';
					}
				}
			}
		}

		/**
		 * @param {string | HTMLElement} input
		 * @returns {string}
		 */
		exec(input) {
			var root = /** @type {HTMLElement} */ ($(input));
			this.buffer = [];
			this.emit('onbeforeprocess', this);
			this.mainloop(root, root);
			this.normalize();
			this.emit('onafterprocess', this);
			return this.getResult();
		}
	}

	/**
	 * @param {string | HTMLElement} node
	 * @returns {string[]}
	 */
	function identify(node) {
		/** @type {string[]} */
		var tmpIds = [];
		Array.prototype.forEach.call(
			$(node)?.querySelectorAll('a, img, object, embed') ?? [],
			/** @param {Element} node */
			function (node) {
				if (node.hasAttribute('id')) return;

				var tmpId;
				do {
					tmpId = 'tmpid_' +
						('0000' + Math.floor(Math.random() * 0x10000)).substr(-4);
				} while ($(tmpId));

				node.setAttribute('id', tmpId);
				tmpIds.push(tmpId);
			}
		);
		return tmpIds;
	}

	/**
	 * @param {unknown} tmpIds
	 * @returns {void}
	 */
	function unidentify(tmpIds) {
		if (!(tmpIds instanceof Array)) return;
		tmpIds.forEach(function (id) {
			var node = $(id);
			node && node.removeAttribute('id');
		});
	}

	/**
	 * @param {string | HTMLElement} input
	 * @param {MarkdownOpts} [opts]
	 * @returns {string}
	 */
	function run(input, opts) {
		return (new ToPlainText(opts)).exec(input);
	}

	return {
		identify: identify,
		unidentify: unidentify,
		run: run
	};
})();

/**
 * @param {string} type
 * @param {EventListener} mediator
 * @returns {MutationObserverCtor}
 */
function getMutationObserver(type, mediator) {
	var win = /** @type {Record<string, typeof MutationObserver | undefined>} */ (/** @type {unknown} */ (window));
	return /** @type {MutationObserverCtor} */ (/** @type {unknown} */ (
		window.MutationObserver
		|| win.WebKitMutationObserver
		|| win.OMutationObserver
		|| win.MozMutationObserver
		|| /** @param {unknown} [handler] @returns {PseudoMutationObserver} */ function (handler) {
			return {
				/** @type {Element | null} */
				element: null,
				/** @param {Node} target @param {MutationObserverInit} [options] */
				observe(target, options) {
					this.element = /** @type {Element} */ (target);
					this.element && this.element.addEventListener(
						'DOM' + type, mediator, false);
				},
				disconnect() {
					this.element && this.element.removeEventListener(
						'DOM' + type, mediator, false);
					this.element = null;
				},
				toString() {
					return '[object WasaviPseudoMutationObserver]';
				}
			};
		}
	));
}

/**
 * @param {Element} sentinel
 * @returns {Element[]}
 */
function getFocusables(sentinel) {
	/** @type {Element[]} */
	var ordered = [];
	/** @type {Element[]} */
	var unordered = [];
	var nodes = document.evaluate([
		'//a[@href]',
		'//link[@href]',
		'//button[not(@disabled)]',
		'//input[not(@disabled)][@type!="hidden"]',
		'//select[not(@disabled)]',
		'//textarea[not(@disabled)]',
		'//command[not(disalbed)]',
		'//*[@tabIndex>=0]'
	].join('|'), document.body, null, window.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

	for (var i = 0, goal = nodes.snapshotLength; i < goal; i++) {
		var node = /** @type {Element} */ (nodes.snapshotItem(i));
		var s = /** @type {WindowProxy} */ (document.defaultView).getComputedStyle(node, '');
		if (s.visibility != 'visible') continue;
		if (node == sentinel) continue;

		var ti = parseInt(node.getAttribute('tabIndex') ?? '');
		(!isNaN(ti) && ti > 0 ? ordered : unordered).push(node);
	}

	return ordered.concat(unordered);
}

/**
 * @param {HTMLElement} element
 * @param {...(string | number)} args
 * @returns {void}
 */
function assign(element, ...args) {
	var style = /** @type {Record<string, string | number>} */ (/** @type {unknown} */ (element.style));
	for (var i = 0, goal = args.length; i < goal; i += 2) {
		var styleName = /** @type {string} */ (args[i]);
		var value = args[i + 1];
		if (style[styleName] == value) continue;
		style[styleName] = value;
	}
}

/**
 * @param {Element} element
 * @param {(e: {target: Element}) => void} callback
 * @returns {{connect: () => void, disconnect: () => void}}
 */
function createElementRemoveListener(element, callback) {
	function fireRemoved() {
		callback({target: element});
	}

	/** @param {MutationRecord[]} records */
	function handleRemove(records) {
		element
		&& records.some(function (r) {
			return r.removedNodes
				&& Array.prototype.indexOf.call(r.removedNodes, element) >= 0;
		})
		&& fireRemoved();
	}

	function connect() {
		var target = /\bWasaviPseudoMutationObserver\b/.test(mo.toString()) ?
				element : /** @type {Node} */ (element.parentNode);
		mo.observe(target, {childList: true});
	}

	function disconnect() {
		mo.disconnect();
	}

	var moCtor = getMutationObserver('NodeRemoved', fireRemoved);

	var mo = new moCtor(handleRemove);
	connect();
	return {connect: connect, disconnect: disconnect};
}

/**
 * @param {HTMLElement} element
 * @param {(e: {target: HTMLElement}) => void} callback
 * @returns {{connect: () => void, disconnect: () => void, fire: () => void}}
 */
function createElementResizeListener(element, callback) {
	function fireIfResized() {
		if (timer) return;
		timer = setTimeout(function () {
			timer = null;
			callback({target: element});
		}, 100);
	}

	/**
	 * @param {Event} e
	 * @returns {void}
	 */
	function attrModified(e) {
		/** @type {{attrName?: string}} */ (/** @type {unknown} */ (e)).attrName == 'style' && fireIfResized();
	}

	function connect() {
		mo.observe(element, {attributes: true, attributeFilter: ['style']});
		window.addEventListener('resize', fireIfResized, false);
		element.addEventListener('mouseup', fireIfResized, false);
	}

	function disconnect() {
		mo.disconnect();
		window.removeEventListener('resize', fireIfResized, false);
		element.removeEventListener('mouseup', fireIfResized, false);
	}

	/**
	 * @param {HTMLElement} element
	 * @returns {{left: number, top: number, width: number, height: number}}
	 */
	function getRect(element) {
		var r = element.getBoundingClientRect();
		return {
			left: r.left,
			top: r.top,
			width: r.width,
			height: r.height
		};
	}

	var moCtor = getMutationObserver('AttrModified', attrModified);
	var rect = getRect(element);
	/** @type {ReturnType<typeof setTimeout> | null} */
	var timer;

	var mo = new moCtor(fireIfResized);
	connect();
	return {connect: connect, disconnect: disconnect, fire: fireIfResized};
}

//

/**
 * @param {string} key
 * @returns {boolean}
 */
function isAcceptable(key) {
	return key in ACCEPTABLE_TYPES && /** @type {Record<string, boolean>} */ (allowedElements)[ACCEPTABLE_TYPES[/** @type {keyof typeof ACCEPTABLE_TYPES} */ (key)]];
}

/**
 * @param {HTMLElement} target
 * @returns {boolean}
 */
function isLaunchableElement(target) {
	return target.isContentEditable && (allowedElements?.enableContentEditable ?? false)
		|| target.nodeName == 'BODY' && (allowedElements?.enablePage ?? false)
		|| /^(?:TEXTAREA|INPUT)$/.test(target.nodeName) && isAcceptable(/** @type {HTMLInputElement} */ (target).type);
}

/**
 * @param {Element} target
 * @returns {boolean}
 */
function doesTargetAllowLaunch(target) {
	/*
	 * <textarea>
	 * <textarea data-texteditor-extension="auto">
	 *     one of extensions installed into browser is executed.
	 *
	 * <textarea data-texteditor-extension="none">
	 *     no extension is executed.
	 *
	 * <textarea data-texteditor-extension="wasavi">
	 *     wasavi extension is executed.
	 */

	var current = target.getAttribute(EXTENSION_CURRENT);
	var spec = target.getAttribute(EXTENSION_SPECIFIER);
	if (current !== null) return false;
	if (spec !== null && spec !== 'auto' && spec !== extension.name) return false;
	return true;
}

/**
 * @param {KeyboardEvent} e
 * @returns {boolean | undefined}
 */
function matchWithShortcut(e) {
	return shortcutCode && shortcutCode.some(function (code) {
		var event = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (e));
		for (var i in code) {
			if (!(i in e)) return false;
			if (event[i] !== code[i]) return false;
		}
		return true;
	});
}

/** @returns {DOMRect} */
function getFullscreenRect() {
	var cover = document.body.appendChild(document.createElement('div'));
	cover.style.position = 'fixed';
	cover.style.left = cover.style.top =
	cover.style.right = cover.style.bottom = FULLSCREEN_MARGIN + 'px';
	var result = cover.getBoundingClientRect();
	cover.remove();
	return result;
}

// classes <<<1
/**
 * @typedef {object} LocateRect
 * @property {number} left
 * @property {number} top
 * @property {number} width
 * @property {number} height
 * @property {number} [right]
 * @property {number} [bottom]
 */
/**
 * @typedef {object} LocateOpts
 * @property {boolean | null} [isFullscreen]
 * @property {number | null} [width]
 * @property {number | null} [height]
 */
/**
 * @typedef {object} ElementRemoveListener
 * @property {() => void} connect
 * @property {() => void} disconnect
 */
/**
 * @typedef {object} ElementResizeListener
 * @property {() => void} connect
 * @property {() => void} disconnect
 * @property {() => void} fire
 */
/**
 * @typedef {object} AgentRequestProps
 * @property {string} [tabId]
 * @property {string} [childTabId]
 * @property {number} [frameId]
 * @property {string} [fontFamily]
 * @property {string} [value]
 * @property {number} [width]
 * @property {number} [height]
 * @property {string} [writeAs]
 * @property {boolean} [isImplicit]
 * @property {boolean} [isForce]
 * @property {boolean} [isSyncSize]
 * @property {string} [key]
 * @property {string} [type]
 * @property {string} [siteOverrides]
 * @property {number} [statusLineHeight]
 * @property {boolean} [quickActivation]
 * @property {boolean} [devMode]
 * @property {boolean} [logMode]
 * @property {Record<string, boolean>} [targets]
 * @property {readonly Record<string, unknown>[]} [shortcutCode]
 * @property {Record<string, unknown>} [items]
 */
/** @typedef {AgentRequestProps & Record<string, unknown>} AgentRequest */
/**
 * @typedef {(data?: unknown) => void} AgentResponse
 */

	// private functions
	/**
	 * @param {Element} element
	 * @returns {boolean}
	 */
	function isFixedPosition(element) {
		if (element == document.body) return true;
		var isFixed = false;
		/** @type {Node | null} */
		var tmp = element;
		for (; tmp; tmp = tmp.parentNode) {
			if (tmp.nodeType == window.Node.DOCUMENT_NODE) break;
			if (tmp.nodeType == window.Node.DOCUMENT_FRAGMENT_NODE) break;
			var s = /** @type {WindowProxy} */ (document.defaultView).getComputedStyle(/** @type {Element} */ (tmp), '');
			if (s && s.position == 'fixed') {
				isFixed = true;
				break;
			}
		}
		return isFixed;
	}

	/**
	 * @param {CSSStyleDeclaration} s
	 * @param {string} [fontFamilyOverride]
	 * @returns {string}
	 */
	function getFontStyle(s, fontFamilyOverride) {
		return [
			s.fontStyle, s.fontVariant, s.fontWeight,
			s.fontSize + '/' + s.lineHeight,
			(fontFamilyOverride || s.fontFamily)
		].join(' ');
	}

	/**
	 * @param {Element} element
	 * @returns {string}
	 */
	function getNodePath(element) {
		/** @type {string[]} */
		var result = [];
		/** @type {Node | null} */
		var node = element;
		while (node?.parentNode) {
			var nodeName = node.nodeName.toLowerCase();
			var parentNode = /** @type {Element} */ (node.parentNode);
			if (parentNode.getElementsByTagName) {
				var index = Array.prototype.indexOf.call(
					parentNode.getElementsByTagName(node.nodeName), node);
				result.unshift(nodeName + '[' + index + ']');
			}
			else {
				result.unshift(nodeName);
			}
			node = node.parentNode;
		}
		return result.join(' ');
	}

	/**
	 * @param {HTMLElement} iframe
	 * @param {HTMLElement} target
	 * @param {LocateOpts} [opts]
	 * @returns {LocateRect}
	 */
	function locate(iframe, target, opts) {
		opts || (opts = {});
		var isFullscreen = !!opts.isFullscreen;

		if (isFullscreen) {
			var fsRect = getFullscreenRect();
			assign(
				iframe,
				'position', 'fixed',
				'left', FULLSCREEN_MARGIN + 'px',
				'top', FULLSCREEN_MARGIN + 'px',
				'width', fsRect.width + 'px',
				'height', fsRect.height + 'px');

			return fsRect;
		}
		else {
			var domRect = target.getBoundingClientRect();
			/** @type {LocateRect} */
			var rect = {
				left:   domRect.left,
				top:    domRect.top,
				width:  Math.max(MIN_WIDTH_PIXELS, domRect.width),
				height: Math.max(MIN_HEIGHT_PIXELS, domRect.height + (statusLineHeight ?? 0))
			};
			rect.right = rect.left + rect.width;
			rect.bottom = rect.top + rect.height;

			var position = 'fixed';
			var centerLeft, centerTop, offsetLeft = 0, offsetTop = 0;

			if (!isFixedPosition(target)) {
				position = 'absolute';
				offsetLeft = Math.max(document.documentElement.scrollLeft, document.body.scrollLeft);
				offsetTop = Math.max(document.documentElement.scrollTop, document.body.scrollTop);
			}
			centerLeft = rect.left + offsetLeft + rect.width / 2;
			centerTop = rect.top + offsetTop + rect.height / 2;

			var result = {
				left:   Math.max(0, Math.floor(centerLeft - rect.width / 2)),
				top:    Math.max(0, Math.floor(centerTop - rect.height / 2)),
				width:  rect.width,
				height: rect.height
			};

			var fullRect = getFullscreenRect();
			var crect = {
				left:   fullRect.left   + offsetLeft,
				top:    fullRect.top    + offsetTop,
				right:  fullRect.right  + offsetLeft,
				bottom: fullRect.bottom + offsetTop,
				width:  fullRect.width,
				height: fullRect.height
			}

			if (result.width > crect.width) result.width = crect.width;
			if (result.height > crect.height) result.height = crect.height;

			if (result.left < crect.left) result.left = crect.left;
			if (result.top  < crect.top ) result.top  = crect.top;
			if (result.left + result.width > crect.right) result.left = crect.right - result.width;
			if (result.top + result.height > crect.bottom) result.top = crect.bottom - result.height;

			assign(
				iframe,
				'position', position,
				'left', result.left + 'px',
				'top', result.top + 'px',
				'width', result.width + 'px',
				'height', result.height + 'px');

			return result;
		}
	}

	/**
	 * @param {MessageEvent} e
	 * @returns {void}
	 */
	function handlePostMessage(e) {
		if (WasaviExtensionWrapper.IS_GECKO) {
			if (e.origin != 'moz-extension://' + /** @type {{id: string}} */ (/** @type {unknown} */ (chrome.runtime)).id) return;
		}
		else if (window.chrome) {
			if (e.origin != 'chrome-extension://' + /** @type {{id: string}} */ (/** @type {unknown} */ (chrome.runtime)).id) return;
		}
		diag.push('wasavi: ' + e.data);
	}

	class Agent {
	/** @type {HTMLElement | null} */
	targetElement;
	/** @type {number} */
	frameId;
	/** @type {ElementRemoveListener | null | undefined} */
	targetElementRemoveListener;
	/** @type {ElementResizeListener | null | undefined} */
	targetElementResizeListener;
	/** @type {HTMLIFrameElement | null} */
	wasaviFrame;
	/** @type {string | null} */
	wasaviFrameTabId;
	/** @type {ReturnType<typeof setTimeout> | null} */
	wasaviFrameTimeoutTimer;
	/** @type {number | null} */
	widthOwn;
	/** @type {number | null} */
	heightOwn;
	/** @type {boolean | null} */
	isFullscreen;
	/** @type {boolean | null} */
	isSyncSize;
	/** @type {ReturnType<typeof setTimeout> | null} */
	stateClearTimer;

	/**
	 * @param {HTMLElement} element
	 * @param {number} frameId
	 */
	constructor(element, frameId) {
		this.targetElement = element;
		this.frameId = frameId;
		this.targetElementRemoveListener = null;
		this.targetElementResizeListener = null;
		this.wasaviFrame = null;
		this.wasaviFrameTabId = null;
		this.wasaviFrameTimeoutTimer = null;
		this.widthOwn = null;
		this.heightOwn = null;
		this.isFullscreen = false;
		this.isSyncSize = false;
		this.stateClearTimer = null;
		this.#prepare();
	}

	// private methods
	/** @returns {void} */
	#prepare() {
		fireCustomEvent('WasaviStarting', 0);
		diag.init().push('agent: entering prepare()');
		window.addEventListener('message', handlePostMessage, false);

		readContentFromElement(this.targetElement, (element, content, type, writeAs) => {
			if (typeof content != 'string') {
				this.#cleanup();
				error('retrieving the content of element timed out.');
				diag.out();
				return;
			}

			/** @type {AgentRequest} */
			var payload = {
				value: content,
				elementType: type,
				writeAs: writeAs || ''
			};
			if (type == 'textarea') {
				var textarea = /** @type {HTMLTextAreaElement} */ (element);
				payload.readOnly = textarea.readOnly || textarea.disabled;
			}

			this.targetElement = element;
			this.#run(payload);
		});
	}

	/**
	 * @param {AgentRequest} [overrides]
	 * @returns {void}
	 */
	#run(overrides) {
		diag.push('agent: entering run()');

		/*
		 * boot sequence:
		 *
		 * background		agent		wasavi
		 *     |              |           |
		 *     |              |..........>|
		 *     |              |(create iframe)
		 *     |              |           |
		 *     |<.........................|
		 *     |(background recoginizes the iframe)
		 *     |              |           |
		 *     |<-------------|           |
		 *     |"push-payload"            |
		 *     |              |           |
		 *     |<-------------------------|
		 *     |           "init"         |
		 *     |              |           |
		 *     |------------------------->|
		 *     |       "init-response"    |
		 *     |              |           |
		 *     |              |<----------|
		 *     |              |"initialized"
		 *     |              |           |
		 *
		 */

		var element = /** @type {HTMLInputElement} */ (this.targetElement);

		// create iframe
		element.setAttribute(EXTENSION_CURRENT, extension.name);
		this.wasaviFrame = document.createElement('iframe');
		assign(
			this.wasaviFrame,
			'border', 'none',
			'overflow', 'hidden',
			'visibility', 'hidden',
			'zIndex', 0x7fffffff);
		this.wasaviFrame.src = /** @type {WasaviUrlInfo} */ (extension.urlInfo).frameSource;
		document.body.appendChild(this.wasaviFrame);

		// set up some properties
		this.widthOwn = this.heightOwn = null;
		this.isFullscreen = false;
		this.isSyncSize = true;

		// register some event listeners
		this.targetElementRemoveListener = createElementRemoveListener(
			this.wasaviFrame,
			() => {
				this.#cleanup();
				error('wasavi terminated abnormally.');
				diag.out();
			}
		);
		this.wasaviFrameTimeoutTimer = setTimeout((/** @type {Agent} */ that) => {
			that.#cleanup();
			that.wasaviFrameTimeoutTimer = null;
		}, BOOT_WAIT_TIMEOUT_MSECS, this);

		// build boot data payload and post it
		var rect = locate(this.wasaviFrame, element);
		/** @type {AgentRequest} */
		var payload = {
			type: 'push-payload',
			parentTabId: extension.tabId,
			frameId: this.frameId,
			url: window.location.href,
			title: document.title,
			testMode: isTestFrame,
			id: element.id,
			nodeName: element.nodeName,
			nodePath: getNodePath(element),
			elementType: element.type,
			setargs: siteOverrides?.setargs(element) || '',
			selectionStart: element.selectionStart || 0,
			selectionEnd: element.selectionEnd || 0,
			scrollTop: element.scrollTop || 0,
			scrollLeft: element.scrollLeft || 0,
			readOnly: false,
			value: '',
			rect: {width: rect.width, height: rect.height},
			fontStyle: getFontStyle(/** @type {WindowProxy} */ (document.defaultView).getComputedStyle(element, ''), fontFamily),
			marks: element.getAttribute(MARKS_ID)
		}
		if (overrides) {
			for (var i in overrides) {
				payload[i] = overrides[i];
			}
		}
		extension.postMessage(payload);

		diag.push('agent: leaving run()');
	}

	/** @returns {void} */
	#blurFromFrame() {
		try {
			this.wasaviFrame?.contentWindow?.blur?.();
		} catch (e) {}

		try {
			this.wasaviFrame?.blur?.();
		} catch (e) {}
	}

	/**
	 * @param {string} [value]
	 * @param {boolean} [isImplicit]
	 * @returns {void}
	 */
	#cleanup(value, isImplicit) {
		if (this.targetElement) {
			if (typeof value == 'string') {
				writeContentToElement(this.targetElement, value, {
					writeAs: /** @type {{writeAs?: string}} */ (this.targetElement).writeAs
				});
			}
			!isImplicit && this.targetElement.focus();
			this.targetElement.removeAttribute(EXTENSION_CURRENT);
			this.targetElement = null;
		}
		if (this.targetElementRemoveListener) {
			this.targetElementRemoveListener.disconnect();
			this.targetElementRemoveListener = undefined;
		}
		if (this.wasaviFrame) {
			if (this.wasaviFrame.parentNode) {
				this.wasaviFrame.parentNode.removeChild(this.wasaviFrame);
			}
			this.wasaviFrame = null;
		}
		if (this.stateClearTimer) {
			clearTimeout(this.stateClearTimer);
			this.stateClearTimer = null;
		}
		if (this.targetElementResizeListener) {
			this.targetElementResizeListener.disconnect();
			this.targetElementResizeListener = undefined;
		}

		if (Object.keys(wasaviAgentsHash).length == 1) {
			window.removeEventListener('beforeunload', handleBeforeUnload, false);
		}

		this.isFullscreen = this.isSyncSize = null;

		delete wasaviAgentsHash[this.frameId];
	}

	/**
	 * @param {{target: HTMLElement}} e
	 * @returns {void}
	 */
	#handleTargetResize(e) {
		if (!this.wasaviFrame || !this.targetElement) return;
		locate(this.wasaviFrame, this.targetElement, {
			isFullscreen: this.isFullscreen,
			width: this.widthOwn,
			height: this.heightOwn
		});
	}

	// public methods
	/**
	 * @param {unknown} payload
	 * @returns {void}
	 */
	notifyToChild(payload) {
		if (!this.wasaviFrameTabId) return;
		extension.postMessage({
			type: 'transfer',
			to: this.wasaviFrameTabId,
			payload: payload
		});
	}

	/**
	 * @param {((that: Agent) => void) | null} callback
	 * @param {number} [msec]
	 * @returns {void}
	 */
	setStateClearTimer(callback, msec) {
		if (this.stateClearTimer) {
			clearTimeout(this.stateClearTimer);
			this.stateClearTimer = null;
		}
		if (typeof callback == 'function') {
			this.stateClearTimer = setTimeout((/** @type {Agent} */ that) => {
				that.stateClearTimer = null;
				try {
					callback(that);
				}
				catch (e) {
				}
			}, msec || 100, this);
		}
	}

	/**
	 * @param {AgentRequest} req
	 * @param {unknown} sender
	 * @param {AgentResponse} response
	 * @returns {void}
	 */
	initialized(req, sender, response) {
		if (!this.wasaviFrame) return;
		this.wasaviFrameTabId = req.childTabId ?? null;
		this.wasaviFrame.style.boxShadow = '0 3px 8px 4px rgba(0,0,0,0.5)';
		this.wasaviFrame.setAttribute('data-wasavi-state', 'running');
		this.targetElementResizeListener = createElementResizeListener(
			/** @type {HTMLElement} */ (this.targetElement),
			this.#handleTargetResize.bind(this));

		if (Object.keys(wasaviAgentsHash).length == 1) {
			window.addEventListener('beforeunload', handleBeforeUnload, false);
		}

		if (isTestFrame) {
			if (!$('wasavi_frame')) {
				this.wasaviFrame.id = 'wasavi_frame';
			}
			/** @type {HTMLInputElement} */ ($('test-log')).value = '';
		}

		response({type: 'got-initialized'});
	}

	/**
	 * @param {AgentRequest} req
	 * @param {unknown} sender
	 * @param {AgentResponse} response
	 * @returns {void}
	 */
	ready(req, sender, response) {
		var frame = /** @type {HTMLIFrameElement} */ (this.wasaviFrame);
		frame.style.visibility = 'visible';
		document.activeElement != this.wasaviFrame && this.focusMe(req, sender, response);
		info('wasavi started');
		fireCustomEvent('WasaviStarted', 0);

		clearTimeout(/** @type {ReturnType<typeof setTimeout>} */ (this.wasaviFrameTimeoutTimer));
		this.wasaviFrameTimeoutTimer = null;

		window.removeEventListener('message', handlePostMessage, false);

		diag.out();
	}

	/**
	 * @param {AgentRequest} req
	 * @param {unknown} sender
	 * @param {AgentResponse} response
	 * @returns {void}
	 */
	windowState(req, sender, response) {
		switch (req.state) {
		case 'maximized':
		case 'normal':
			this.isFullscreen = req.state == 'maximized';
			locate(/** @type {HTMLElement} */ (this.wasaviFrame), /** @type {HTMLElement} */ (this.targetElement), {
				isFullscreen: this.isFullscreen
			});
			response({
				type: 'relocate',
				state: req.state
			});
			break;
		}
	}

	/**
	 * @param {AgentRequest} req
	 * @param {unknown} sender
	 * @param {AgentResponse} response
	 * @returns {void}
	 */
	focusMe(req, sender, response) {
		try {
			this.wasaviFrame?.focus?.();
		} catch (e) {}

		try {
			this.wasaviFrame?.contentWindow?.focus?.();
		} catch (e) {}

		response({type: 'focus-me-response'});
	}

	/**
	 * @param {AgentRequest} req
	 * @returns {void}
	 */
	focusChanged(req) {
		var focusables = getFocusables(/** @type {Element} */ (this.wasaviFrame));
		var index = focusables.indexOf(/** @type {Element} */ (this.targetElement));
		try {
			if (index >= 0) {
				var next = req.direction == 1 ?
					(index + 1) % focusables.length :
					(index + focusables.length - 1) % focusables.length;

				this.#blurFromFrame();

				if (next == /** @type {unknown} */ (this.targetElement)) {
					document.body.focus();
				}
				else {
					/** @type {HTMLElement} */ (focusables[next]).focus();
				}
			}
			else {
				document.body.focus();
			}
		}
		catch (e) {}
	}

	/**
	 * @param {AgentRequest} req
	 * @returns {void}
	 */
	blinkMe(req) {
		var frame = /** @type {HTMLIFrameElement} */ (this.wasaviFrame);
		frame.style.visibility = 'hidden';
		setTimeout((/** @type {HTMLIFrameElement} */ frame) => {
			frame.style.visibility = '';
		}, 1000, this.wasaviFrame);
	}

	/**
	 * @param {AgentRequest} req
	 * @param {unknown} sender
	 * @param {AgentResponse} response
	 * @returns {void}
	 */
	setSize(req, sender, response) {
		var target = /** @type {HTMLElement} */ (this.targetElement);
		if ('isSyncSize' in req) {
			this.isSyncSize = req.isSyncSize ?? false;
			if (this.isSyncSize) {
				this.widthOwn = this.heightOwn = null;
			}
			else {
				this.widthOwn = target.offsetWidth;
				this.heightOwn = target.offsetHeight;
			}
		}
		if ('width' in req) {
			if (this.isSyncSize) {
				target.style.width = req.width + 'px';
				this.widthOwn = null;
			}
			else {
				this.widthOwn = req.width ?? 0;
			}
		}
		if ('height' in req) {
			if (this.isSyncSize) {
				target.style.height = req.height + 'px';
				this.heightOwn = null;
			}
			else {
				this.heightOwn = req.height ?? 0;
			}
		}
		this.targetElementResizeListener?.fire();
		response({
			type: 'relocate',
			isSyncSize: req.isSyncSize
		});
	}

	/**
	 * @param {AgentRequest} req
	 * @returns {void}
	 */
	terminated(req) {
		if (isTestFrame) {
			this.setStateClearTimer(null);
			/** @type {HTMLElement} */ (document.querySelector('h1')).style.color = '';
		}
		if (req.marks) {
			/** @type {HTMLElement} */ (this.targetElement).setAttribute(MARKS_ID, /** @type {string} */ (req.marks));
		}
		if (req.isSubmitRequested
		&& this.targetElement
		&& /** @type {HTMLInputElement} */ (this.targetElement).form
		&& /** @type {HTMLInputElement} */ (this.targetElement).form.action != '') {
			setTimeout((/** @type {HTMLFormElement} */ form) => {
				var submitter = form.querySelector(
					'input[type="submit"],button[type="submit"]');
				if (submitter) {
					/** @type {HTMLElement} */ (submitter).click();
				}
				else {
					form.submit();
				}
			}, 1, /** @type {HTMLInputElement} */ (this.targetElement).form);
		}
		this.#cleanup(req.value, req.isImplicit);
		info('wasavi terminated');
		fireCustomEvent('WasaviTerminated', Object.keys(wasaviAgentsHash).length);
	}

	/**
	 * @param {AgentRequest} req
	 * @param {unknown} sender
	 * @param {AgentResponse} response
	 * @returns {void}
	 */
	read(req, sender, response) {
		readContentFromElement(this.targetElement, (element, content, type) => {
			/** @type {AgentRequest} */
			var payload = {type: 'read-response'};

			if (typeof content != 'string') {
				payload.error = _('Cannot read the content of element.');
			}
			else {
				payload.state = 'complete';
				payload.meta = {
					path: '',
					bytes: content.length
				};
				payload.content = content;
			}

			response(payload);
		});
	}

	/**
	 * @param {AgentRequest} req
	 * @param {unknown} sender
	 * @param {AgentResponse} response
	 * @returns {void}
	 */
	write(req, sender, response) {
		/** @type {AgentRequest} */
		var payload = {type: 'write-response'};
		try {
			var result = writeContentToElement(this.targetElement, req.value ?? '', {
				isForce: req.isForce,
				writeAs: req.writeAs
			});
			if (typeof result == 'number') {
				var ev;

				if (/^(?:INPUT|TEXTAREA)$/.test(this.targetElement?.nodeName ?? '')) {
					// input event
					// NOTE: input event constructor is fluid.
					ev = document.createEvent('Event');
					ev.initEvent('input', true, false);
					/** @type {HTMLElement} */ (this.targetElement).dispatchEvent(ev);

					// change event
					ev = document.createEvent('Event');
					ev.initEvent('change', true, false);
					/** @type {HTMLElement} */ (this.targetElement).dispatchEvent(ev);
				}

				payload.state = 'complete';
				payload.meta = {
					path: req.path,
					bytes: result
				};
			}
			else if (result instanceof Array) {
				payload.error = result;
			}
			else {
				payload.error = _('Internal state error.');
			}
		}
		catch (ex) {
			payload.error = _('Internal exception: ' + /** @type {Error} */ (ex).message);
		}
		finally {
			payload.exstate = {
				isBuffered: req.isBuffered
			};

			response(payload);
		}
	}

	/**
	 * @param {AgentRequest} req
	 * @returns {void}
	 */
	requestBlur(req) {
		this.wasaviFrame?.blur();
		document.body.focus();
	}

	/**
	 * @param {AgentRequest} req
	 * @returns {void}
	 */
	reload(req) {
		setTimeout(() => {
			window.removeEventListener('beforeunload', handleBeforeUnload, false);
			window.location.reload();
		}, 1000);
	}
	}

// agent manager functions <<<1
/**
 * @param {HTMLElement} targetElement
 * @returns {void}
 */
function startAgent(targetElement) {
	for (var i = 0; i < INSTANCE_MAX; i++) {
		if (i in wasaviAgentsHash) continue;
		wasaviAgentsHash[i] = new Agent(targetElement, i);
		break;
	}
}

/**
 * @param {Element | null} target
 * @param {keyof Agent} [property]
 * @returns {Agent | null}
 */
function findAgent(target, property) {
	property || (property = 'targetElement');
	for (var i in wasaviAgentsHash) {
		if (wasaviAgentsHash[i][property] == target) {
			return wasaviAgentsHash[i];
		}
	}
	return null;
}

/**
 * @param {...unknown} args
 * @returns {void}
 */
function keylog(...args) {
	testLog || (testLog = []);
	testLog.push(args.join('\t'));
}

/** @returns {void} */
function keylogOutput() {
	var t = /** @type {HTMLInputElement | null} */ ($('test-log'));
	if (!t) return;
	t.value.length && (t.value += '\n');
	t.value += /** @type {string[]} */ (testLog).join('\n');
	t.scrollTop = t.scrollHeight - t.clientHeight;
	/** @type {string[]} */ (testLog).length = 0;
}

/**
 * @param {string} s
 * @returns {RegExp | null}
 */
function getGlobRegex(s) {
	try {
		return new RegExp('^' + s
			.replace(/[\\^$+.()|{}]/g, function ($0) {return '\\' + $0})
			.replace(/\?/g, '.')
			.replace(/\*/g, '.+?'), 'i');
	}
	catch (e) {
		return null;
	}
}

/**
 * @param {string} list
 * @returns {SiteOverrides}
 */
function parseSiteOverrides(list) {
	/** @type {SiteOverrides} */
	let result = {
		_selectors: [],
		blocked(element) {
			return this._selectors.some(s => {
				try {
					let match = Array.prototype.indexOf.call(
						document.querySelectorAll(s.selector), element);
					return match >= 0 && s.blocked;
				}
				catch (e) {}
			});
		},
		setargs(element) {
			/** @type {string | undefined} */
			let result;
			this._selectors.some(s => {
				try {
					let match = Array.prototype.indexOf.call(
						document.querySelectorAll(s.selector), element);
					if (match >= 0) {
						result = s.setargs;
						return true;
					}
				}
				catch (e) {}
			});

			return result;
		}
	};

	/**
	 * @param {string} string
	 * @param {string | RegExp} delimiter
	 * @param {number} limit
	 * @returns {string[]}
	 */
	function splitex(string, delimiter, limit) {
		let regex = new RegExp(delimiter, 'g');
		/** @type {string[]} */
		let result = [];
		let from = 0;
		/** @type {RegExpExecArray | null} */
		let re = null;

		while (result.length < limit && (re = regex.exec(string))) {
			result.push(string.substring(from, re.index));
			from = re.index + re[0].length;
		}

		if (result.length < limit) {
			result.push(string.substring(from));
		}
		else if (re && from < string.length) {
			result[result.length - 1] += string.substring(re.index);
		}

		return result;
	}

	(list || '').split('\n').forEach(line => {
		line = line.replace(/^\s+|\s+$/g, '');
		if (line == '' || /^[#;]/.test(line)) return;

		let parts = splitex(line, /\s+/, 3);
		if (parts.length < 3) return;

		let [urlPattern, selector, action] = parts;

		let urlRegex = getGlobRegex(urlPattern);
		if (!urlRegex || !urlRegex.test(window.location.href)) return;

		/** @type {boolean | undefined} */
		let blocked;
		/** @type {string | undefined} */
		let setargs;

		if (action.toLowerCase() == 'block') {
			blocked = true;
		}
		else {
			setargs = action;
		}

		result._selectors.push({
			selector: selector,
			blocked: blocked,
			setargs: setargs
		});
	});

	result._selectors.sort((a, b) => {
		if (a.selector == '*') return 1;
		if (b.selector == '*') return -1;
		return 0;
	});

	console.log(JSON.stringify(result, null, ' '));

	return result;
}

/**
 * @param {(req: AgentRequest) => void} callback
 * @returns {void}
 */
function connect(callback) {
	var connected = false;
	var retryRest = 5;
	var wait = 1000;
	var eventName = isOptionsPage ? 'init-options' : 'init-agent';
	var gotInit = function (/** @type {AgentRequest} */ req) {
		if (connected) return;
		connected = true;
		callback(req);
	};
	var checkIfConnectedOrRetry = function () {
		if (connected || retryRest <= 0) return;
		retryRest--;
		wait += 1000;
		setTimeout(function () {checkIfConnectedOrRetry()}, wait);
		extension.connect(eventName, /** @type {(response: unknown) => void} */ (gotInit));
	}

	checkIfConnectedOrRetry();
}

/**
 * @param {boolean} listenKeydown
 * @param {boolean} usePageContextScript
 * @returns {void}
 */
function createPageAgent(listenKeydown, usePageContextScript) {
	var parent = document.head || document.body || document.documentElement;
	if (!parent) return;

	window.addEventListener('focus', handleTargetFocus, true);

	if (listenKeydown) {
		window.addEventListener('keydown', handleKeydown, true);
	}

	if (usePageContextScript) {
		var s = document.createElement('script');
		s.onload = function () {
			var self = /** @type {HTMLScriptElement} */ (this);
			self.onload = null;
			self.parentNode && self.parentNode.removeChild(self);
		};
		s.type = 'text/javascript';
		s.src = extension.getPageContextScriptSrc();
		parent.appendChild(s);
	}
}

/**
 * @typedef {(element: HTMLElement, content: string | null, type?: string | null, writeAs?: string | null) => void} ContentCallback
 */
/**
 * @typedef {object} ContentQueueSlot
 * @property {HTMLElement} element
 * @property {ContentCallback} callback
 * @property {ReturnType<typeof setTimeout> | null} timeoutTimer
 */
var readContentFromElement = (function () {
	/** @type {(this: MarkdownAppendable, n: Element, name: string) => void} */
	function pre (n, name) {this.append('<wasavi:' + name + ' id="' + n.id + '">')}
	/** @type {(this: MarkdownAppendable, n: Element, name: string) => void} */
	function post (n, name) {this.append('</wasavi:' + name + '>')}

	/**
	 * @param {HTMLElement} element
	 * @returns {HTMLElement | null}
	 */
	function findPseudoTextAreaContainer(element) {
		/** @type {HTMLElement | null} */
		var result = null;
		/** @type {HTMLElement | null} */
		var e = element;
		for (; e; e = /** @type {HTMLElement | null} */ (e.parentNode)) {
			if (!e.classList) continue;
			if (e.classList.contains('CodeMirror')
			||  e.classList.contains('ace_editor')) {
				result = e;
				break;
			}
		}
		return result;
	}

	/**
	 * @param {CustomEvent<string>} e
	 * @returns {void}
	 */
	function handleResponseGetContent(e) {
		var index = e.detail.indexOf('\t');
		if (index < 0) return;

		var className = e.detail.substring(0, index);
		if (!(className in callbackQueue)) return;

		var slot = callbackQueue[className];
		if (slot.timeoutTimer) {
			clearTimeout(slot.timeoutTimer);
			slot.timeoutTimer = null;
		}

		slot.element.classList.remove(className);
		delete callbackQueue[className];
		slot.callback(
			slot.element, e.detail.substring(index + 1),
			'pseudoTextArea');
	}

	/**
	 * @param {string | HTMLElement} element
	 * @returns {string}
	 */
	function getMarkdown(element) {
		element = /** @type {HTMLElement} */ ($(element));
		markDown.identify(element);
		return markDown.run(element, markdownOpts);
	}

	/** @returns {string} */
	function getBodyContent() {
		/** @type {string[]} */
		var content = [];
		/** @type {Element | null} */
		var el;
		/** @type {string | null} */
		var s;

		// title
		if ((el = document.querySelector('title, h1')) && (s = el.textContent) != '') {
			content.push(el.textContent);
		}

		// url
		if ((el = document.querySelector('link[rel="canonical"]')) && (s = el.getAttribute('href')) != '') {
			content.push(s ?? '');
		}
		else {
			content.push(window.location.href);
		}

		// description
		if ((el = document.querySelector('meta[name="description"]')) && (s = el.getAttribute('content')) != '') {
			content.push('', s ?? '');
		}

		// selection
		if ((s = (window.getSelection()?.toString() ?? '')
			.replace(/(?:\r\n|\r|\n)/g, '\n')
			.replace(/\n{2,}/g, '\n')) != '') {
			content.push('', s);
		}

		return content.join('\n');
	}

	/** @type {Record<string, ContentQueueSlot>} */
	var callbackQueue = {};
	var markdownOpts = {
		preunits: {
			/** @type {(this: MarkdownAppendable, node: Element, nodeName: string) => void} */
			img(node, nodeName) { this.append('<wasavi:img id="' + node.id + '"></wasavi:img>') },
			a: pre, embed: pre, object: pre
		},
		postunits: {
			a: post, embed: post, object: post
		}
	};

	document.addEventListener('WasaviResponseGetContent', /** @type {EventListener} */ (handleResponseGetContent), false);

	/**
	 * @param {HTMLElement | null} element
	 * @param {ContentCallback} callback
	 * @returns {void}
	 */
	return function readContentFromElement(element, callback) {
		element = /** @type {HTMLElement} */ (element);
		var pseudoTextArea = findPseudoTextAreaContainer(element);

		if (pseudoTextArea) {
			var className = getUniqueClass();
			pseudoTextArea.classList.add(className);
			callbackQueue[className] = {
				element: pseudoTextArea,
				callback: callback,
				timeoutTimer: setTimeout(
					function (/** @type {string} */ className) {
						var slot = callbackQueue[className];
						if (!slot) return;

						slot.element.classList.remove(className);
						delete callbackQueue[className];
						slot.timeoutTimer = null;
						slot.callback(slot.element, null);
					},
					BOOT_WAIT_TIMEOUT_MSECS, className
				)
			};
			setTimeout(
				function (/** @type {string} */ className) {
					fireCustomEvent('WasaviRequestGetContent', className);
				},
				1, className
			);
		}

		else if (/^(?:INPUT|TEXTAREA)$/.test(element.nodeName)) {
			callback(element, /** @type {HTMLInputElement} */ (element).value, element.nodeName.toLowerCase());
		}

		else if (element.isContentEditable) {
			let setargs = siteOverrides?.setargs(element);
			let writeAs = 'html';
			if (setargs) {
				let re = /\bwriteas\s*=\s*(\w+)/.exec(setargs);
				if (re) {
					writeAs = re[1];
				}
			}

			callback(element, getMarkdown(element), 'contentEditable', writeAs);
		}

		else if (element.nodeName == 'BODY') {
			callback(element, getBodyContent(), 'body');
		}

		else {
			callback(element, null, null, null);
		}
	};
})();

/**
 * @typedef {(f: DocumentFragment, content: string) => number} WriteJob
 */
/**
 * @typedef {object} WriteOpts
 * @property {boolean} [isForce]
 * @property {string} [writeAs]
 */
var writeContentToElement = (function () {
	/** @type {WriteJob} */
	function toDiv(f, content) {
		var length = 0;
		var lines = content.split('\n');

		for (var i = 0, goal = lines.length; i < goal; i++) {
			f.appendChild(document.createElement('div'))
				.appendChild(document.createTextNode(lines[i]));
			length += lines[i].length + 1;
		}

		return length;
	}

	/** @type {WriteJob} */
	function toParagraph(f, content) {
		var length = 0;
		var lines = content.split('\n');

		for (var i = 0, goal = lines.length; i < goal; i++) {
			f.appendChild(document.createElement('p'))
				.appendChild(document.createTextNode(lines[i]));
			length += lines[i].length + 1;
		}

		return length;
	}

	/** @type {WriteJob} */
	function toTextAndBreak(f, content) {
		var length = 0;
		var lines = content.split('\n');

		for (var i = 0, goal = lines.length - 1; i < goal; i++) {
			f.appendChild(document.createTextNode(lines[i]));
			f.appendChild(document.createElement('br'));
			length += lines[i].length + 1;
		}

		if (lines.length >= 1) {
			f.appendChild(document.createTextNode(lines[lines.length - 1]));
			length += lines[i].length;
		}

		return length;
	}

	/** @type {WriteJob} */
	function toPlaintext(f, content) {
		f.appendChild(document.createTextNode(content));
		return content.length;
	}

	/**
	 * @param {Element} root
	 * @param {readonly string[]} children
	 * @returns {Element[]}
	 */
	function elementsOf(root, children) {
		/** @type {Element[]} */
		var result = [];
		for (var i = 0, goal = children.length; i < goal; i++) {
			result.push(...root.getElementsByTagName('wasavi:' + children[i]));
		}
		return result;
	}

	/**
	 * @param {Element} element
	 * @returns {void}
	 */
	function toHTMLImage(element) {
		var id = element.getAttribute('id');
		if (!id) return;

		var linked = $(id);
		if (!linked) return;

		element.parentNode?.replaceChild(linked, element);
	}

	/**
	 * @param {Element} element
	 * @returns {void}
	 */
	function toHTMLAnchor(element) {
		var id = element.getAttribute('id');
		if (!id) return;

		var linked = $(id);
		if (!linked) return;

		var r = document.createRange();
		r.selectNodeContents(element);
		var contents = r.extractContents();

		element.parentNode?.replaceChild(linked, element);
		r.selectNodeContents(linked);
		r.deleteContents();
		linked.appendChild(contents);
	}

	/**
	 * @param {Element} element
	 * @param {string} content
	 * @param {WriteJob} job
	 * @returns {number | unknown[]}
	 */
	function overwrite(element, content, job) {
		var f = document.createDocumentFragment();
		var length = job(f, content);

		try {
			var r = document.createRange();
			r.selectNodeContents(element);
			r.deleteContents();

			element.appendChild(f)
			return length;
		}
		catch (e) {
			return _('Exception while saving: {0}', /** @type {Error} */ (e).message);
		}
	}

	/**
	 * @param {Element} element
	 * @param {string} content
	 * @returns {number}
	 */
	function buildHTML(element, content) {
		var r = document.createRange();
		r.selectNodeContents(element);

		element.insertAdjacentHTML('beforeend', content);

		elementsOf(element, ['img']).forEach(toHTMLImage);
		elementsOf(element, ['a', 'object', 'embed']).forEach(toHTMLAnchor);

		r.deleteContents();

		return element.textContent.length;
	}

	/**
	 * @param {HTMLElement | null} element
	 * @param {string | null} content
	 * @param {WriteOpts} [opts]
	 * @returns {number | unknown[]}
	 */
	return function writeContentToElement(element, content, opts) {
		element = /** @type {HTMLElement} */ (element);
		content || (content = '');
		opts || (opts = {});

		if (element.classList.contains('CodeMirror')
		 || element.classList.contains('ace_editor')) {
			if (typeof content != 'string') {
				return _('Invalid text format.');
			}
			var className = getUniqueClass();
			element.classList.add(className);
			fireCustomEvent('WasaviRequestSetContent', className + '\t' + content);
			element.classList.remove(className);
			return content.length;
		}

		else if (/^(?:INPUT|TEXTAREA)$/.test(element.nodeName)) {
			var input = /** @type {HTMLInputElement} */ (element);
			if (input.readOnly) {
				if (opts.isForce) {
					input.readOnly = false;
				}
				else {
					return _('Element to be written has readonly attribute (use "!" to override).');
				}
			}
			if (input.disabled) {
				if (opts.isForce) {
					input.disabled = false;
				}
				else {
					return _('Element to be written has disabled attribute (use "!" to override).');
				}
			}
			if (typeof content != 'string') {
				return _('Invalid text format.');
			}
			try {
				input.value = content;
				return content.length;
			}
			catch (e) {
				return _('Exception while saving: {0}', /** @type {Error} */ (e).message);
			}
		}

		else if (element.isContentEditable) {
			/*
			 * There are various newline formats in content editable element.
			 * These formats are different depending on sites, so we have to choice
			 * the correct format by list.  So `writeAs` property can be assigned
			 * following values:
			 *
			 *   - 'html': treat a text as markdown, and build DOM tree (default)
			 *   - 'div': create div element from each line
			 *
			 *       <div>line1</div><div>line2</div> ...
			 *
			 *   - 'p': create p element from each line
			 *
			 *       <p>line1</p><p>line2</p> ...
			 *
			 *   - 'textAndBreak': create text node from each line, and each line is
			 *     divided by a BR element.
			 *
			 *       #text <br> #text ...
			 *
			 *   - 'plaintext': create a text node. newline is '\n'
			 *
			 *       line1 \n line2 ...
			 */
			switch ((opts.writeAs ?? '').toLowerCase()) {
			case 'div':
				return overwrite(element, content, toDiv);

			case 'p':
				return overwrite(element, content, toParagraph);

			case 'textandbreak':
				return overwrite(element, content, toTextAndBreak);

			case 'plantext':
				return overwrite(element, content, toPlaintext);

			case 'html': default:
				return buildHTML(element, content);
			}
		}

		else if (element.nodeName == 'BODY') {
			return _('Cannot rewrite the page itself.');
		}

		else {
			return _('Unknown node name: {0}', element.nodeName);
		}
	};
})();

// event listeners <<<1
/**
 * @param {KeyboardEvent} e
 * @returns {void}
 */
function handleKeydown(e) {
	if (!e || !e.target || !allowedElements) return;
	if (e.keyCode == 16 || e.keyCode == 17 || e.keyCode == 18) return;

	var target = getShadowActiveElement(/** @type {Element} */ (e.target));
	if (siteOverrides?.blocked(/** @type {Element} */ (target))) return;
	if (!isLaunchableElement(/** @type {HTMLElement} */ (target))) return;
	if (!doesTargetAllowLaunch(/** @type {Element} */ (target))) return;
	if (!matchWithShortcut(e)) return;
	if (findAgent(target)) return;

	e.preventDefault();
	e.stopPropagation();
	startAgent(/** @type {HTMLElement} */ (target));
}

/**
 * @param {FocusEvent} e
 * @returns {void}
 */
function handleTargetFocus(e) {
	if (!quickActivation || !e || !e.target || !allowedElements) return;

	var target = getShadowActiveElement(/** @type {Element} */ (e.target));
	if (siteOverrides?.blocked(/** @type {Element} */ (target))) return;
	if (!isLaunchableElement(/** @type {HTMLElement} */ (target))) return;
	if (!doesTargetAllowLaunch(/** @type {Element} */ (target))) return;
	if (findAgent(target)) return;

	e.preventDefault();
	startAgent(/** @type {HTMLElement} */ (target));
}

/** @returns {void} */
function handleRequestLaunch() {
	if (!allowedElements) return;
	if (typeof document.hasFocus == 'function' && !document.hasFocus()) return;

	var target = getShadowActiveElement(document.activeElement);
	if (siteOverrides?.blocked(/** @type {Element} */ (target))) return;
	if (!isLaunchableElement(/** @type {HTMLElement} */ (target))) return;
	if (!doesTargetAllowLaunch(/** @type {Element} */ (target))) return;
	if (findAgent(target)) return;

	startAgent(/** @type {HTMLElement} */ (target));
}

/**
 * @param {BeforeUnloadEvent} e
 * @returns {string | undefined}
 */
function handleBeforeUnload(e) {
	if (Object.keys(wasaviAgentsHash).length) {
		return e.returnValue = 'wasavi: Unexpected closing. Are you sure?';
	}
}

/**
 * @param {AgentRequest} req
 * @returns {void}
 */
function handleAgentInitialized(req) {
	if (isOptionsPage) {
		var wasaviOptions = /** @type {{extension: unknown, initPage: (req: AgentRequest) => void}} */ (/** @type {Record<string, unknown>} */ (/** @type {unknown} */ (window)).WasaviOptions);
		wasaviOptions.extension = extension;
		wasaviOptions.initPage(req);
	}

	if (extension.isTopFrame() && document.querySelector('textarea')) {
		info('running on ', window.location.href.replace(/[#?].*$/, ''));
	}
}

var handleBackendMessage = (function () {
	/**
	 * @param {Agent | null} agent
	 * @param {AgentRequest} req
	 * @returns {void}
	 */
	function updateStorage(agent, req) {
		/** @type {string[]} */
		var logbuf = [];
		/** @type {unknown} */
		var so;
		for (var i in req.items) {
			var value = req.items[i];
			switch (i) {
			case 'targets':
				allowedElements = /** @type {Record<string, boolean>} */ (value);
				logbuf.push(i);
				break;

			case 'shortcutCode':
				shortcutCode = /** @type {readonly Record<string, unknown>[]} */ (value);
				logbuf.push(i);
				break;

			case 'quickActivation':
				quickActivation = /** @type {boolean} */ (value);
				logbuf.push(i);
				break;

			case 'logMode':
				logMode = /** @type {boolean} */ (value);
				logbuf.push(i);
				break;

			case 'siteOverrides':
				so = value;
				logbuf.push(i);
				break;
			}
		}
		if (so) {
			siteOverrides = parseSiteOverrides(/** @type {string} */ (so));
		}
		logbuf.length && log(
			'update-storage: consumed ', logbuf.join(', '));
	}

	/**
	 * @param {Agent | null} agent
	 * @param {AgentRequest} req
	 * @returns {void}
	 */
	function requestRun(agent, req) {
		handleRequestLaunch();
	}

	/**
	 * @param {Agent | null} agent
	 * @param {AgentRequest} req
	 * @returns {void}
	 */
	function ping(agent, req) {
	}

	/**
	 * @param {Agent | null} agent
	 * @param {AgentRequest} req
	 * @returns {void}
	 */
	function notifyKeydown(agent, req) {
		if (!isTestFrame) return;
		agent?.setStateClearTimer(null);
		var frame = /** @type {HTMLIFrameElement} */ (agent?.wasaviFrame);
		if (frame.getAttribute('data-wasavi-command-state') != 'busy') {
			frame.setAttribute('data-wasavi-command-state', 'busy');
			/** @type {HTMLElement} */ (document.querySelector('h1')).style.color = 'red';
			keylog('-', '-', 'command start, frame #' + req.frameId);
		}

		var args = [];
		'key'       in req && (req.key ?? '').charCodeAt(0) >= 32 && args.push(req.key);
		'keyCode'   in req && args.push(req.keyCode);
		'eventType' in req && args.push(req.eventType);
		keylog.apply(null, args);
	}

	/**
	 * @param {Agent | null} agent
	 * @param {AgentRequest} req
	 * @returns {void}
	 */
	function notifyError(agent, req) {
		if (!isTestFrame) return;
		keylog(
			'error on ' + /** @type {HTMLElement} */ (document.querySelector('h1')).textContent,
			req.fileName + '(' + req.lineNumber + ')',
			req.message);
	}

	/**
	 * @param {Agent | null} agent
	 * @param {AgentRequest} req
	 * @returns {void}
	 */
	function notifyState(agent, req) {
		if (!isTestFrame) return;
		agent?.setStateClearTimer(function (agent) {
			var frame = /** @type {HTMLIFrameElement} */ (agent.wasaviFrame);
			var state = /** @type {Record<string, unknown>} */ (req.state);
			frame.setAttribute('data-wasavi-state', JSON.stringify(req.state));
			frame.setAttribute('data-wasavi-input-mode', /** @type {string} */ (state.inputMode));
			frame.removeAttribute('data-wasavi-command-state');

			keylog('notify-state');
		});
	}

	/**
	 * @param {Agent | null} agent
	 * @param {AgentRequest} req
	 * @returns {void}
	 */
	function commandCompleted(agent, req) {
		if (!isTestFrame) return;
		agent?.setStateClearTimer(function (agent) {
			var frame = /** @type {HTMLIFrameElement} */ (agent.wasaviFrame);
			var reqState = /** @type {Record<string, unknown>} */ (req.state);
			try {
				frame.setAttribute('data-wasavi-state', JSON.stringify(req.state));
				frame.setAttribute('data-wasavi-input-mode', /** @type {string} */ (reqState.inputMode));
				frame.setAttribute('data-wasavi-line-input', /** @type {string} */ (reqState.lineInput));

				/** @type {HTMLElement} */ (document.querySelector('h1')).style.color = '';

				var state = /** @type {HTMLElement} */ ($('state'));
				state.textContent = '';
				['running', 'state', 'inputMode', 'row', 'col', 'lastMessage'].forEach(function (p) {
					state.appendChild(document.createElement('div')).textContent =
						p + ': ' + reqState[p];
				});
			}
			finally {
				if (req.type == 'command-completed') {
					frame.removeAttribute('data-wasavi-command-state');
					keylog('--- sequence point ---');
				}
				else {
					frame.setAttribute('data-wasavi-command-state', 'completed');
					keylog('*** complete sequence point ***');
					keylogOutput();
				}

			}
		});
	}

	/** @type {Record<string, (agent: Agent | null, req: AgentRequest, sender: unknown, response: AgentResponse) => void>} */
	var handlerMap = {
		/*
		 * messages transferred from wasavi
		 */

		'initialized':   function initialized (a,d,s,r)  { a?.initialized(d, s, r) },
		'ready':         function ready (a,d,s,r)        { a?.ready(d, s, r) },
		'window-state':  function windowState (a,d,s,r)  { a?.windowState(d, s, r) },
		'focus-me':      function focusMe (a,d,s,r)      { a?.focusMe(d, s, r) },
		'focus-changed': function focusChanged (a,d,s,r) { a?.focusChanged(d) },
		'blink-me':      function blinkMe (a,d,s,r)      { a?.blinkMe(d) },
		'set-size':      function setSize (a,d,s,r)      { a?.setSize(d, s, r) },
		'terminated':    function terminated (a,d,s,r)   { a?.terminated(d) },
		'read':          function read (a,d,s,r)         { a?.read(d, s, r) },
		'write':         function write (a,d,s,r)        { a?.write(d, s, r) },
		'request-blur':  function requestBlur (a,d,s,r)  { a?.requestBlur(d) },
		'reload':        function reload (a,d,s,r)       { a?.reload(d) },

		/*
		 * messages from backend
		 */

		'update-storage': updateStorage,
		'request-run':    requestRun,
		'ping':           ping,

		/*
		 * following cases are for functionality test.
		 * available only on http://127.0.0.1/test_frame.html
		 */

		'notify-keydown':    notifyKeydown,
		'notify-error':      notifyError,
		'notify-state':      notifyState,
		'command-completed': commandCompleted,
		'commands-completed': commandCompleted,
	};

	/**
	 * @param {AgentRequest} req
	 * @param {unknown} sender
	 * @param {AgentResponse} response
	 * @returns {void}
	 */
	return function (req, sender, response) {
		if (!req || !req.type) return;

		logMode && log(
			'got "' + req.type + '" message from backend:',
			JSON.stringify(req).substring(0, 200));

		var type = req.type ?? '';
		if (!(type in handlerMap)) return;

		if (req.frameId != null) {
			var frameId = req.frameId;
			if (!(frameId in wasaviAgentsHash)) return;
			handlerMap[type](wasaviAgentsHash[frameId], req, sender, response);
		}
		else {
			handlerMap[type](null, req, sender, response);
		}
	};
})();

/**
 * @param {AgentRequest} req
 * @returns {void}
 */
function handleConnect(req) {
	if (!req || (!isOptionsPage && (!('tabId' in req) || !req.tabId))) {
		if (logMode) {
			var missing = '?';
			if (!req) {
				missing = 'empty req object';
			}
			else if (!('tabId' in req)) {
				missing = 'missing req.tabId';
			}
			error(
				'wasavi agent: got init-response message',
				' (' + missing + ').');
		}
		return;
	}

	if (!isOptionsPage) extension.tabId = req.tabId ?? null;
	allowedElements = req.targets;
	shortcutCode = req.shortcutCode;
	fontFamily = req.fontFamily;
	quickActivation = req.quickActivation;
	devMode = req.devMode;
	logMode = req.logMode;
	siteOverrides = parseSiteOverrides(req.siteOverrides ?? '');
	statusLineHeight = req.statusLineHeight;

	extension.ensureRun(handleAgentInitialized, req);
}

// bootstrap <<<1
createPageAgent(true, true);
extension.setMessageListener(handleBackendMessage);
document.addEventListener('WasaviRequestLaunch', handleRequestLaunch, false);
connect(handleConnect);

})(typeof globalThis == 'object' ? globalThis : window);

// vim:set ts=4 sw=4 fileencoding=UTF-8 fileformat=unix filetype=javascript fdm=marker fmr=<<<,>>> fdl=1 :
