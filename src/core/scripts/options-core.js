/**
 * main logics of options page
 *
 * @author akahuku@gmail.com
 */
/**
 * Copyright 2012-2016 akahuku, akahuku@gmail.com
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

(function (global) {

var SAVED_MESSAGE_VISIBLE_SECS = 2;

/** @type {{getMessage(id: string): string | undefined, postMessage(message: object, callback?: (response: any) => void): void}} */
var extension;

/**
 * @param {string | HTMLElement} arg
 * @returns {HTMLElement | null}
 */
function $ (arg) {
	return typeof arg == 'string' ? document.getElementById(arg) : arg;
}

/**
 * page initializer
 * ----------------
 */

/**
 * @param {Node} node
 * @param {string} text
 */
function markup (node, text) {
	var debug = /\* /.test(text);

	text = text.replace(/(?:\*\s+(?:\*\S|[^*])+(?:\n|$))+/g, function ($0) {
		return '[ul]' +
			$0.replace(/\*\s+((?:\*\S|[^*])+(?:\n|$))/g, '[li]$1[/li]') +
			'[/ul]';
	});

	text = text.replace(/\n/g, '[br]');
	text = text.replace(/\[br\](\[\/\w+\])/g, '$1');

	var pattern = /((?:\\.|[^\[])+)|(\[\/?(\w+)[^\]]*\])/g;
	/** @type {{name: string, node: Node}[]} */
	var stack = [{name:'#root', node: node}];

	for (var re; (re = pattern.exec(text)); ) {
		var s = re[1] || re[2];

		if (s.charAt(0) == '[') {
			if (s.charAt(1) == '/') {
				// close tag
				if (stack.length && stack[0].name == re[3]) {
					stack.shift();
				}
			}
			else {
				// open tag
				var newNode = null;
				switch (re[3]) {
				case 'c':
					newNode = document.createElement('code');
					break;

				case 'i':
				case 'b':
				case 'ul':
				case 'li':
					newNode = document.createElement(re[3]);
					break;

				case 'br':
					stack[0].node.appendChild(
						document.createElement('br'));
					s = '';
					break;
				}

				if (newNode) {
					stack.unshift({
						name: re[3],
						node: stack[0].node.appendChild(newNode)
					});
				}
				else if (s != '') {
					stack[0].node.appendChild(document.createTextNode(
						s.replace(/\\(.)/g, '$1')
					));
				}
			}
		}
		else {
			// text node
			stack[0].node.appendChild(document.createTextNode(
				s.replace(/\\(.)/g, '$1')
			));
		}
	}
}

/**
 * @param {Record<string, any>} src
 */
function applySettings (src) {
	/*
	 * apply settings to form elements. each key is applied only when it is
	 * present in src, so partial application is possible.
	 */

	/** @type {HTMLElement | null} */
	var el;

	// exrc
	if ('exrc' in src) {
		el = $('exrc');
		if (el && el.nodeName == 'TEXTAREA') {
			(/** @type {HTMLTextAreaElement} */ (el)).value = src.exrc;
		}
	}

	// targets
	if (src.targets) {
		for (var i in src.targets) {
			el = $(i);
			if (el && el.nodeName == 'INPUT' && (/** @type {HTMLInputElement} */ (el)).type == 'checkbox') {
				(/** @type {HTMLInputElement} */ (el)).checked = src.targets[i];
			}
		}
	}

	// quick activation
	if ('quickActivation' in src) {
		el = /** @type {HTMLElement | null} */ (document.querySelector([
			'input',
			'[name="quick-activation"]',
			'[value="' + (src.quickActivation ? '1' : '0') + '"]'
		].join('')));
		if (el) {
			(/** @type {HTMLInputElement} */ (el)).checked = true;
		}
	}

	// site overrides
	if ('siteOverrides' in src) {
		el = $('site-overrides');
		if (el && el.nodeName == 'TEXTAREA') {
			(/** @type {HTMLTextAreaElement} */ (el)).value = src.siteOverrides;
		}
	}

	// shortcut
	if ('shortcut' in src) {
		el = $('shortcut');
		if (el && el.nodeName == 'INPUT') {
			(/** @type {HTMLInputElement} */ (el)).value = src.shortcut;
		}
	}

	// font family
	if ('fontFamily' in src) {
		el = $('font-family');
		if (el && el.nodeName == 'INPUT') {
			(/** @type {HTMLInputElement} */ (el)).value = src.fontFamily;
		}
	}

	// log mode
	if ('logMode' in src) {
		el = $('log-mode');
		if (el && el.nodeName == 'INPUT' && (/** @type {HTMLInputElement} */ (el)).type == 'checkbox') {
			(/** @type {HTMLInputElement} */ (el)).checked = src.logMode;
		}
	}

	// upgrade action
	if ('upgradeNotify' in src) {
		el = $('upgrade-notify');
		if (el && el.nodeName == 'INPUT' && (/** @type {HTMLInputElement} */ (el)).type == 'checkbox') {
			(/** @type {HTMLInputElement} */ (el)).checked = src.upgradeNotify;
		}
	}
}

/**
 * @param {{messageCatalog?: Record<string, {message: string}>} & Record<string, any>} req
 */
function initPage (req) {
	/*
	 * initialize form elements
	 */

	/** @type {HTMLElement | null} */
	var el;

	applySettings(req);

	/*
	 * replace all message ids to translated one
	 */

	var iter = (/** @type {(root: Node, whatToShow?: number, filter?: NodeFilter | null, entityReferenceExpansion?: boolean) => NodeIterator} */ (document.createNodeIterator))(
		document, window.NodeFilter.SHOW_TEXT, null, false);

	/** @type {[Node, string][]} */
	var texts = [];
	for (var node = iter.nextNode(); node; node = iter.nextNode()) {
		var re = /^\s*__MSG_(.+)__\s*$/.exec(/** @type {string} */ (node.textContent));
		re && texts.push([node, re[1]]);
	}

	texts.forEach(function (text) {
		var node = text[0];
		var id = text[1];

		var message;
		if (req.messageCatalog) {
			if (id in req.messageCatalog) {
				message = req.messageCatalog[id].message;
			}
			else {
				message = id;
			}
		}
		else {
			message = extension.getMessage(id) || id;
		}

		node.nodeValue = '';
		markup(/** @type {Node} */ (node.parentNode), message);
	});

	/*
	 * init event handlers
	 */

	el = $('capture');
	if (el) {
		el.addEventListener('click', handleCapture, false);
	}

	el = $('save');
	if (el) {
		el.addEventListener('click', handleOptionsSave, false);
	}

	el = $('export');
	if (el) {
		el.addEventListener('click', handleOptionsExport, false);
	}

	el = $('import');
	if (el) {
		el.addEventListener('click', handleOptionsImport, false);
	}

	el = $('import-file');
	if (el) {
		el.addEventListener('change', handleImportFileChange, false);
	}

	el = $('opt-init');
	if (el) {
		el.addEventListener('click', handleOptionsInit, false);
	}

	/*
	 * transition
	 */

	var overlay = /** @type {HTMLElement} */ ($('overlay'));
	/** @type {(e: Event) => void} */
	var tend = function (e) {
		(/** @type {Node} */ (e.target)).parentNode && (/** @type {Node} */ (e.target)).parentNode.removeChild(/** @type {Node} */ (e.target));
	};

	'transitionend webkitTransitionEnd oTransitionEnd msTransitionEnd'
	.split(' ')
	.forEach(function (p) {overlay.addEventListener(p, tend, false)});

	overlay.className = 'overlay';
}

/**
 * capture button handler
 * ----------------
 */

/**
 * @param {KeyboardEvent} e
 */
function handleKeydown (e) {
	if (e.shiftKey && e.keyCode == 16 || e.ctrlKey && e.keyCode == 17) {
		var codes = [];
		e.shiftKey && codes.push('s');
		e.ctrlKey && codes.push('c');
		(/** @type {HTMLElement} */ ($('capture-wait'))).textContent =
			(/** @type {HTMLElement} */ ($('capture-wait-buffer'))).textContent +
			' <' + codes.join('-') + '- >';
		return;
	}

	e.preventDefault();
	(/** @type {HTMLButtonElement} */ ($('capture'))).disabled = true;
	extension.postMessage(
		{
			type: 'query-shortcut',
			data: {
				shiftKey: e.shiftKey,
				ctrlKey: e.ctrlKey,
				keyCode: e.keyCode
			}
		},
		function (res) {
			if (res.result) {
				var shortcut = /** @type {HTMLInputElement} */ ($('shortcut'));
				shortcut.value +=
					(shortcut.value.length ? ', ' : '') +
					res.result;
			}

			(/** @type {HTMLButtonElement} */ ($('capture'))).disabled = false;
			(/** @type {HTMLElement} */ ($('capture'))).click();
		}
	);
}

/**
 * @param {KeyboardEvent} e
 */
function handleKeyup (e) {
	(/** @type {HTMLElement} */ ($('capture-wait'))).textContent = (/** @type {HTMLElement} */ ($('capture-wait-buffer'))).textContent;
}

/**
 * @param {Event} e
 */
function handleCapture (e) {
	/** @type {Node | null} */
	var t = /** @type {Node} */ (e.target);
	while (t && t.nodeName.toLowerCase() != 'button') {
		t = t.parentNode;
	}
	if ((/** @type {HTMLElement} */ (t)).classList.contains('wait')) {
		(/** @type {HTMLElement} */ (t)).classList.remove('wait');
		document.body.removeEventListener('keydown', handleKeydown, true);
		document.body.removeEventListener('keyup', handleKeyup, true);

	}
	else {
		(/** @type {HTMLElement} */ (t)).classList.add('wait');
		(/** @type {HTMLElement} */ ($('capture-wait'))).textContent = (/** @type {HTMLElement} */ ($('capture-wait-buffer'))).textContent;
		document.body.addEventListener('keydown', handleKeydown, true);
		document.body.addEventListener('keyup', handleKeyup, true);
	}
}

/**
 * save button handler
 * ----------------
 */

/**
 * @returns {{key: string, value: any}[]}
 */
function collectSettingItems () {
	/** @type {{key: string, value: any}[]} */
	var items = [];
	/** @type {HTMLElement | null} */
	var el;

	// exrc
	el = $('exrc');
	if (el && el.nodeName == 'TEXTAREA') {
		items.push({key:'exrc', value:(/** @type {HTMLTextAreaElement} */ (el)).value});
	}

	// targets
	(function () {
		/** @type {Record<string, boolean>} */
		var targets = {};
		Array.prototype.forEach.call(
			document.querySelectorAll(
				'#targets-container input[type="checkbox"]'),
			function (/** @type {HTMLInputElement} */ node) {
				var re = /^enable\w+/.exec(node.id);
				if (!re) return;

				targets[re[0]] = node.checked;
			}
		);

		items.push({key:'targets', value:targets});
	})();

	// quick activation
	el = /** @type {HTMLElement | null} */ (document.querySelector('input[name="quick-activation"]:checked'));
	if (el) {
		items.push({key:'quickActivation', value:(/** @type {HTMLInputElement} */ (el)).value == '1'});
	}

	// site overrides
	el = $('site-overrides');
	if (el && el.nodeName == 'TEXTAREA') {
		items.push({key:'siteOverrides', value:(/** @type {HTMLTextAreaElement} */ (el)).value});
	}

	// shortcut
	el = $('shortcut');
	if (el) {
		items.push({key:'shortcut', value:(/** @type {HTMLInputElement} */ (el)).value});
	}

	// font family
	el = $('font-family');
	if (el && el.nodeName == 'INPUT') {
		items.push({key:'fontFamily', value:(/** @type {HTMLInputElement} */ (el)).value});
	}

	// log mode
	el = $('log-mode');
	if (el && el.nodeName == 'INPUT' && (/** @type {HTMLInputElement} */ (el)).type == 'checkbox') {
		items.push({key:'logMode', value:(/** @type {HTMLInputElement} */ (el)).checked});
	}

	// upgrade action
	el = $('upgrade-notify');
	if (el && el.nodeName == 'INPUT' && (/** @type {HTMLInputElement} */ (el)).type == 'checkbox') {
		items.push({key:'upgradeNotify', value:(/** @type {HTMLInputElement} */ (el)).checked});
	}

	return items;
}

function handleOptionsSave () {
	var items = collectSettingItems();

	/*
	 * post
	 */

	items.length && extension.postMessage(
		{type:'set-storage', items:items},
		function () {
			var saveResult = $('save-result');
			if (saveResult) {
				saveResult.style.display = 'inline';
				setTimeout(function () {
					(/** @type {HTMLElement} */ (saveResult)).style.display = '';
				}, 1000 * SAVED_MESSAGE_VISIBLE_SECS);
			}
		}
	);
}

/**
 * import / export handler
 * ----------------
 */

/**
 * @returns {string[]}
 */
function getKnownTargetIds () {
	return /** @type {string[]} */ (Array.prototype.map.call(
		document.querySelectorAll('#targets-container input[type="checkbox"]'),
		function (/** @type {HTMLInputElement} */ node) {return node.id}));
}

/**
 * @param {string} msg
 * @param {boolean} isError
 */
function showIoResult (msg, isError) {
	var el = $('io-result');
	if (!el) return;

	el.textContent = msg;
	el.classList.toggle('error', isError);
}

function handleOptionsExport () {
	showIoResult('', false);

	var items = collectSettingItems();
	/** @type {Record<string, unknown>} */
	var settings = {};
	items.forEach(function (item) {
		settings[item.key] = item.value;
	});

	var version =
		(typeof chrome != 'undefined' && chrome.runtime && chrome.runtime.getManifest) ?
		chrome.runtime.getManifest().version : '';

	var now = new Date();
	var envelope = SettingsIO.buildExportEnvelope(settings, version, now);

	var json = JSON.stringify(envelope, null, 2);
	var blob = new Blob([json], {type:'application/json'});
	var url = URL.createObjectURL(blob);
	var a = document.createElement('a');
	a.href = url;
	a.download = SettingsIO.exportFilename(now);
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function handleOptionsImport () {
	var input = $('import-file');
	input && input.click();
}

/**
 * @param {Event} e
 */
function handleImportFileChange (e) {
	var input = /** @type {HTMLInputElement} */ (e.target);
	var file = input.files && input.files[0];
	if (!file) {
		input.value = '';
		return;
	}

	var reader = new FileReader();
	reader.onload = function () {
		var result = SettingsIO.parseImportData(/** @type {string} */ (reader.result), getKnownTargetIds());
		if (!result.ok) {
			showIoResult(getMessage('option_import_error'), true);
			input.value = '';
			return;
		}

		var items = result.items;

		// reflect only the validated values that were actually persisted,
		// so the form never shows settings that import rejected
		/** @type {Record<string, unknown>} */
		var applied = {};
		items.forEach(function (item) {
			applied[item.key] = item.value;
		});

		extension.postMessage(
			{type:'set-storage', items:items},
			function () {
				applySettings(applied);
				showIoResult(getMessage('option_import_done'), false);
			}
		);

		input.value = '';
	};
	reader.onerror = function () {
		showIoResult(getMessage('option_import_error'), true);
		input.value = '';
	};
	reader.readAsText(file);
}

/**
 * @param {string} id
 * @returns {string}
 */
function getMessage (id) {
	return extension.getMessage(id) || id;
}

/**
 * reset button handler
 * ----------------
 */

function handleOptionsInit () {
	var message = (/** @type {HTMLElement} */ ($('opt-init-confirm'))).textContent;
	window.confirm(/** @type {string} */ (message)) && extension.postMessage(
		{type:'reset-options'},
		function () {
			window.location.reload();
		}
	);
}

// `global` is the IIFE-injected global object; TS infers `this` as `undefined`
// for this script, so route through `unknown` to attach the public export.
(/** @type {Record<string, unknown>} */ (/** @type {unknown} */ (global))).WasaviOptions = {
	get extension () {return extension},
	set extension (/** @type {typeof extension} */ v) {extension = v},
	initPage: initPage
};

})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
