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

!(/** @type {typeof globalThis} */ (/** @type {unknown} */ (this))).WasaviExtensionWrapper && (/**
 * @param {typeof globalThis} global
 */
function (global) {
	/* <<<1 consts */
	const IS_GECKO = typeof global.browser !== 'undefined'
		&& typeof global.browser.runtime !== 'undefined'
		// Chrome 148+ also defines `browser` as an alias of `chrome`,
		// so check the extension origin scheme to identify Firefox
		&& global.browser.runtime.getURL('').startsWith('moz-extension://');
	const IS_FX_WEBEXT = IS_GECKO;
	/* >>> */

	/* <<<1 vars */
	var extensionName = 'wasavi';
	var externalFrameURL = 'http://wasavi.appsweets.net/';
	var externalSecureFrameURL = 'https://wasavi.appsweets.net/';
	/* >>> */

	/**
	 * <<<1 url information class
	 * ----------------
	 */

	/**
	 * @constructor
	 * @param {string} [optionsUrl]
	 * @param {string} [internalUrl]
	 */
	function UrlInfo (optionsUrl, internalUrl) {
		/** @type {string | undefined} */
		this.optionsUrl = optionsUrl;
		/** @type {string | undefined} */
		this.internalUrl = internalUrl;
	}

	UrlInfo.prototype = {
		/**
		 * @param {string | undefined} u1
		 * @param {string | undefined} u2
		 * @returns {boolean}
		 */
		eq: function (u1, u2) {
			return (u1 || '').replace(/\?.*/, '')
				== (u2 || '').replace(/\?.*/, '');
		},
		get externalUrl () {return externalFrameURL},
		get externalSecureUrl () {return externalSecureFrameURL},
		/** @this {WasaviUrlInfo} */
		get isInternal () {
			return this.eq(window.location.href, this.internalUrl);
		},
		get isExternal () {
			return this.eq(window.location.href, this.externalUrl)
			    || this.eq(window.location.href, this.externalSecureUrl);
		},
		get isAny () {
			return this.isInternal || this.isExternal;
		},
		/**
		 * @this {WasaviUrlInfo}
		 * @returns {string}
		 */
		get frameSource () {
			if (this.internalUrl) {
				return this.internalUrl;
			}
			else {
				return window.location.protocol == 'https:' ?
					this.externalSecureUrl : this.externalUrl;
			}
		}
	};
	/* >>> */

	/**
	 * <<<1 extension wrapper base class
	 * ----------------
	 */

	/**
	 * @constructor
	 */
	function ExtensionWrapper () {
		/** @type {string | null} */
		this.tabId = null;
		this.requestNumber = 0;
	}
	ExtensionWrapper.prototype = {
		get name () {return extensionName},
		isTopFrame: function () {return global.window == window.top},
		/**
		 * @param {Record<string, unknown>} [data]
		 * @param {(response: unknown) => void} [callback]
		 * @returns {number}
		 */
		postMessage: function (data, callback) {
			var type;
			var requestNumber = this.getNewRequestNumber();

			data || (data = {});

			if ('type' in data) {
				type = data.type;
				delete data.type;
			}

			this.doPostMessage({
				type:type || 'unknown-command',
				tabId:this.tabId,
				requestNumber:requestNumber,
				data:data
			}, callback);

			return requestNumber;
		},
		/**
		 * @param {Record<string, unknown>} data
		 * @param {(response: unknown) => void} [callback]
		 * @returns {void}
		 */
		doPostMessage: function (data, callback) {},
		/**
		 * @param {string} [type]
		 * @param {(response: unknown) => void} [callback]
		 * @returns {void}
		 */
		connect: function (type, callback) {
			this.doConnect();
			this.doPostMessage({
				type:type || 'init',
				tabId:this.tabId,
				requestNumber:this.getNewRequestNumber(),
				data:{url:window.location.href}
			}, callback);
		},
		doConnect: function () {},
		disconnect: function () {
			this.doDisconnect();
		},
		doDisconnect: function () {},
		/**
		 * @param {Function} handler
		 * @returns {void}
		 */
		setMessageListener: function (handler) {},
		/**
		 * @param {Function} handler
		 * @returns {void}
		 */
		addMessageListener: function (handler) {},
		/**
		 * @param {Function} handler
		 * @returns {void}
		 */
		removeMessageListener: function (handler) {},
		/**
		 * @param {...unknown} args
		 * @returns {unknown}
		 */
		runCallback: function () {
			var args = Array.prototype.slice.call(arguments);
			var callback = args.shift();
			if (typeof callback != 'function') {
				return;
			}
			return callback.apply(null, args);
		},
		getUniqueId: function () {
			return this.name
				+ '_' + Date.now()
				+ '_' + Math.floor(Math.random() * 0x10000);
		},
		getNewRequestNumber: function () {
			this.requestNumber = (this.requestNumber + 1) & 0xffff;
			return this.requestNumber;
		},
		/**
		 * @param {string} messageId
		 * @returns {undefined}
		 */
		getMessage: function (messageId) {},
		/**
		 * @param {string} data
		 * @returns {void}
		 */
		setClipboard: function (data) {
			if (IS_GECKO) {
				let buffer = /** @type {HTMLTextAreaElement} */ (document.getElementById('wasavi_fx_clip'));
				buffer.value = data;
				buffer.focus();
				buffer.select();
				document.execCommand('cut');
			}
			else {
				this.postMessage({type:'set-clipboard', data:data});
			}
		},
		/**
		 * @param {...unknown} args
		 * @returns {void}
		 */
		getClipboard: function () {
			var self = this;
			var args = Array.prototype.slice.call(arguments);
			var callback = args.shift();
			this.postMessage({type:'get-clipboard'}, /** @param {unknown} req */ function (req) {
				let clipboardData = /** @type {string} */ (req && /** @type {{data?: string}} */ (req).data || '').replace(/\r\n/g, '\n');
				args.unshift(clipboardData);
				callback.apply(null, args);
			});
		},
		/**
		 * @param {string} [path]
		 * @returns {string}
		 */
		getPageContextScriptSrc: function (path) {
			return '';
		},
		ensureRun: function () {
			/** @type {unknown[]} */
			var args = Array.prototype.slice.call(arguments);
			var callback = /** @type {Function} */ (args.shift());
			/** @type {Document} */
			var doc;
			try {
				doc = document;
				doc.body;
			}
			catch (e) {
				return;
			}
			if (doc.readyState == 'interactive'
			||  doc.readyState == 'complete') {
				callback.apply(null, args);
			}
			else {
				doc.addEventListener(
					'DOMContentLoaded',
					/** @param {Event} e */
					function handleDCL (e) {
						doc.removeEventListener(e.type, handleDCL, false);
						callback.apply(null, args);
					},
					false
				);
			}
		}
	};

	/**
	 * @param {{extensionName?: string, externalFrameURL?: string, externalSecureUrl?: string}} [opts]
	 * @returns {WasaviExtensionWrapperInstance}
	 */
	ExtensionWrapper.create = function (opts) {
		opts || (opts = {});
		'extensionName' in opts && (extensionName = /** @type {string} */ (opts.extensionName));
		'externalFrameURL' in opts && (externalFrameURL = /** @type {string} */ (opts.externalFrameURL));
		'externalSecureUrl' in opts && (externalSecureFrameURL = /** @type {string} */ (opts.externalSecureUrl));
		
		// ChromeExtensionWrapper inherits ExtensionWrapper.prototype at runtime
		// (assigned below); tsc cannot model a wholesale prototype alias (and
		// JSDoc @extends only attaches to a `class`), so its instance type lacks
		// the inherited members. The chrome-specific overrides are still validated
		// against the interface at their `this.x =` sites via @this above.
		if (window.chrome) return /** @type {WasaviExtensionWrapperInstance} */ (/** @type {unknown} */ (new ChromeExtensionWrapper));
		if (global.chrome) return /** @type {WasaviExtensionWrapperInstance} */ (/** @type {unknown} */ (new ChromeExtensionWrapper));
		return new ExtensionWrapper;
	};
	ExtensionWrapper.IS_GECKO = IS_GECKO;
	ExtensionWrapper.IS_FX_WEBEXT = IS_FX_WEBEXT;
	ExtensionWrapper.urlInfo = new UrlInfo;
	/* >>> */

	/**
	 * <<<1 extension wrapper class for chrome
	 * ----------------
	 */

	/**
	 * @constructor
	 * @this {WasaviExtensionWrapperInstance}
	 */
	function ChromeExtensionWrapper () {
		ExtensionWrapper.apply(this, /** @type {[]} */ (/** @type {unknown} */ (arguments)));

		var that = this;
		/** @type {Function[]} */
		var onMessageHandlers = [];

		/**
		 * @param {unknown} req
		 * @param {unknown} sender
		 * @param {(response?: unknown) => void} response
		 */
		function handleMessage (req, sender, response) {
			for (const handler of onMessageHandlers) {
				handler(req, sender, response);
			}
		}

		this.constructor = ExtensionWrapper;
		this.runType = 'chrome-extension';
		/**
		 * @param {Record<string, unknown>} data
		 * @param {(response: unknown) => void} [callback]
		 */
		this.doPostMessage = function (data, callback) {
			try {
				chrome.runtime.sendMessage(data, callback);
			}
			catch (e) {}
		};
		this.doConnect = function () {
			chrome.runtime.onMessage.addListener(handleMessage);
		};
		this.doDisconnect = function () {
			onMessageHandlers.length = 0;
			chrome.runtime.onMessage.removeListener(handleMessage);
		};
		/** @param {Function} handler */
		this.setMessageListener = function (handler) {
			onMessageHandlers = [handler];
		};
		/** @param {Function} handler */
		this.addMessageListener = function (handler) {
			var index = onMessageHandlers.indexOf(handler);
			if (index < 0) {
				onMessageHandlers.push(handler);
			}
		};
		/** @param {Function} handler */
		this.removeMessageListener = function (handler) {
			var index = onMessageHandlers.indexOf(handler);
			if (index >= 0) {
				onMessageHandlers.splice(index, 1);
			}
		};
		/**
		 * @param {string} messageId
		 * @returns {string}
		 */
		this.getMessage = function (messageId) {
			return chrome.i18n.getMessage(messageId);
		};
		this.getPageContextScriptSrc = function () {
			return chrome.runtime.getURL('scripts/page_context.js');
		};
		this.urlInfo = new (/** @type {new () => WasaviUrlInfo} */ (/** @type {unknown} */ (function () {
			return new UrlInfo(
				chrome.runtime.getURL('options.html'),
				chrome.runtime.getURL('wasavi.html')
			);
		})));
	}
	ChromeExtensionWrapper.prototype = ExtensionWrapper.prototype;
	/* >>> */

	/* <<<1 bootstrap */
	ExtensionWrapper.urlInfo.isExternal &&
		document.documentElement.setAttribute('data-wasavi-present', '1');
	global.WasaviExtensionWrapper = ExtensionWrapper;
	/* >>> */

})(/** @type {typeof globalThis} */ (/** @type {unknown} */ (this)));

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker fmr=<<<,>>> :
