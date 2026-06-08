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

var extension;

function $ (arg) {
	return typeof arg == 'string' ? document.getElementById(arg) : arg;
}

/**
 * page initializer
 * ----------------
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

function applySettings (src) {
	/*
	 * apply settings to form elements. each key is applied only when it is
	 * present in src, so partial application is possible.
	 */

	var el;

	// exrc
	if ('exrc' in src) {
		el = $('exrc');
		if (el && el.nodeName == 'TEXTAREA') {
			el.value = src.exrc;
		}
	}

	// targets
	if (src.targets) {
		for (var i in src.targets) {
			el = $(i);
			if (el && el.nodeName == 'INPUT' && el.type == 'checkbox') {
				el.checked = src.targets[i];
			}
		}
	}

	// quick activation
	if ('quickActivation' in src) {
		el = document.querySelector([
			'input',
			'[name="quick-activation"]',
			'[value="' + (src.quickActivation ? '1' : '0') + '"]'
		].join(''));
		if (el) {
			el.checked = true;
		}
	}

	// site overrides
	if ('siteOverrides' in src) {
		el = $('site-overrides');
		if (el && el.nodeName == 'TEXTAREA') {
			el.value = src.siteOverrides;
		}
	}

	// shortcut
	if ('shortcut' in src) {
		el = $('shortcut');
		if (el && el.nodeName == 'INPUT') {
			el.value = src.shortcut;
		}
	}

	// font family
	if ('fontFamily' in src) {
		el = $('font-family');
		if (el && el.nodeName == 'INPUT') {
			el.value = src.fontFamily;
		}
	}

	// log mode
	if ('logMode' in src) {
		el = $('log-mode');
		if (el && el.nodeName == 'INPUT' && el.type == 'checkbox') {
			el.checked = src.logMode;
		}
	}

	// upgrade action
	if ('upgradeNotify' in src) {
		el = $('upgrade-notify');
		if (el && el.nodeName == 'INPUT' && el.type == 'checkbox') {
			el.checked = src.upgradeNotify;
		}
	}
}

function initPage (req) {
	/*
	 * initialize form elements
	 */

	var el;

	applySettings(req);

	/*
	 * replace all message ids to translated one
	 */

	var iter = document.createNodeIterator(
		document, window.NodeFilter.SHOW_TEXT, null, false);

	var texts = [];
	for (var node = iter.nextNode(); node; node = iter.nextNode()) {
		var re = /^\s*__MSG_(.+)__\s*$/.exec(node.textContent);
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
		markup(node.parentNode, message);
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

	var overlay = $('overlay');
	var tend = function (e) {
		e.target.parentNode && e.target.parentNode.removeChild(e.target);
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

function handleKeydown (e) {
	if (e.shiftKey && e.keyCode == 16 || e.ctrlKey && e.keyCode == 17) {
		var codes = [];
		e.shiftKey && codes.push('s');
		e.ctrlKey && codes.push('c');
		$('capture-wait').textContent =
			$('capture-wait-buffer').textContent +
			' <' + codes.join('-') + '- >';
		return;
	}

	e.preventDefault();
	$('capture').disabled = true;
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
				var shortcut = $('shortcut');
				shortcut.value +=
					(shortcut.value.length ? ', ' : '') +
					res.result;
			}

			$('capture').disabled = false;
			$('capture').click();
		}
	);
}

function handleKeyup (e) {
	$('capture-wait').textContent = $('capture-wait-buffer').textContent;
}

function handleCapture (e) {
	var t = e.target;
	while (t && t.nodeName.toLowerCase() != 'button') {
		t = t.parentNode;
	}
	if (t.classList.contains('wait')) {
		t.classList.remove('wait');
		document.body.removeEventListener('keydown', handleKeydown, true);
		document.body.removeEventListener('keyup', handleKeyup, true);

	}
	else {
		t.classList.add('wait');
		$('capture-wait').textContent = $('capture-wait-buffer').textContent;
		document.body.addEventListener('keydown', handleKeydown, true);
		document.body.addEventListener('keyup', handleKeyup, true);
	}
}

/**
 * save button handler
 * ----------------
 */

function collectSettingItems () {
	var items = [];
	var el;

	// exrc
	el = $('exrc');
	if (el && el.nodeName == 'TEXTAREA') {
		items.push({key:'exrc', value:el.value});
	}

	// targets
	(function () {
		var targets = {};
		Array.prototype.forEach.call(
			document.querySelectorAll(
				'#targets-container input[type="checkbox"]'),
			function (node) {
				var re = /^enable\w+/.exec(node.id);
				if (!re) return;

				targets[re[0]] = node.checked;
			}
		);

		items.push({key:'targets', value:targets});
	})();

	// quick activation
	el = document.querySelector('input[name="quick-activation"]:checked');
	if (el) {
		items.push({key:'quickActivation', value:el.value == '1'});
	}

	// site overrides
	el = $('site-overrides');
	if (el && el.nodeName == 'TEXTAREA') {
		items.push({key:'siteOverrides', value:el.value});
	}

	// shortcut
	el = $('shortcut');
	if (el) {
		items.push({key:'shortcut', value:el.value});
	}

	// font family
	el = $('font-family');
	if (el && el.nodeName == 'INPUT') {
		items.push({key:'fontFamily', value:el.value});
	}

	// log mode
	el = $('log-mode');
	if (el && el.nodeName == 'INPUT' && el.type == 'checkbox') {
		items.push({key:'logMode', value:el.checked});
	}

	// upgrade action
	el = $('upgrade-notify');
	if (el && el.nodeName == 'INPUT' && el.type == 'checkbox') {
		items.push({key:'upgradeNotify', value:el.checked});
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
				saveResult.style.visibility = 'visible';
				setTimeout(function () {
					saveResult.style.visibility = '';
				}, 1000 * SAVED_MESSAGE_VISIBLE_SECS);
			}
		}
	);
}

/**
 * import / export handler
 * ----------------
 */

var SETTING_KEYS = [
	'exrc',
	'targets',
	'quickActivation',
	'shortcut',
	'siteOverrides',
	'fontFamily',
	'logMode',
	'upgradeNotify'
];

// expected value type of each setting, used to reject malformed import data
var SETTING_TYPES = {
	exrc: 'string',
	targets: 'object',
	quickActivation: 'boolean',
	shortcut: 'string',
	siteOverrides: 'string',
	fontFamily: 'string',
	logMode: 'boolean',
	upgradeNotify: 'boolean'
};

function isValidSettingValue (key, value) {
	if (key == 'targets') {
		if (value == null || typeof value != 'object' || Array.isArray(value)) {
			return false;
		}
		// only the known target checkboxes, each carrying a boolean
		var known = Array.prototype.map.call(
			document.querySelectorAll('#targets-container input[type="checkbox"]'),
			function (node) {return node.id});
		return Object.keys(value).every(function (k) {
			return known.indexOf(k) >= 0 && typeof value[k] == 'boolean';
		});
	}
	return typeof value == SETTING_TYPES[key];
}

function timestamp () {
	var d = new Date();
	return '' + d.getFullYear() +
		String(d.getMonth() + 1).padStart(2, '0') +
		String(d.getDate()).padStart(2, '0') +
		String(d.getHours()).padStart(2, '0') +
		String(d.getMinutes()).padStart(2, '0') +
		String(d.getSeconds()).padStart(2, '0');
}

function showIoResult (msg, isError) {
	var el = $('io-result');
	if (!el) return;

	el.textContent = msg;
	el.classList.toggle('error', isError);
}

function handleOptionsExport () {
	showIoResult('', false);

	var items = collectSettingItems();
	var settings = {};
	items.forEach(function (item) {
		settings[item.key] = item.value;
	});

	var version =
		(typeof chrome != 'undefined' && chrome.runtime && chrome.runtime.getManifest) ?
		chrome.runtime.getManifest().version : '';

	var envelope = {
		format: 'wasavi-fork-settings',
		version: version,
		exportedAt: new Date().toISOString(),
		settings: settings
	};

	var json = JSON.stringify(envelope, null, 2);
	var blob = new Blob([json], {type:'application/json'});
	var url = URL.createObjectURL(blob);
	var a = document.createElement('a');
	a.href = url;
	a.download = 'wasavi-fork_' + timestamp() + '.json';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function handleOptionsImport () {
	var input = $('import-file');
	input && input.click();
}

function handleImportFileChange (e) {
	var input = e.target;
	var file = input.files && input.files[0];
	if (!file) {
		input.value = '';
		return;
	}

	var reader = new FileReader();
	reader.onload = function () {
		var data;
		try {
			data = JSON.parse(reader.result);
		}
		catch (ex) {
			showIoResult(getMessage('option_import_error'), true);
			input.value = '';
			return;
		}

		if (!data ||
			typeof data != 'object' ||
			data.format !== 'wasavi-fork-settings' ||
			!data.settings ||
			typeof data.settings != 'object') {
			showIoResult(getMessage('option_import_error'), true);
			input.value = '';
			return;
		}

		var items = [];
		SETTING_KEYS.forEach(function (key) {
			if (key in data.settings && isValidSettingValue(key, data.settings[key])) {
				items.push({key:key, value:data.settings[key]});
			}
		});

		if (items.length == 0) {
			showIoResult(getMessage('option_import_error'), true);
			input.value = '';
			return;
		}

		// reflect only the validated values that were actually persisted,
		// so the form never shows settings that import rejected
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

function getMessage (id) {
	return extension.getMessage(id) || id;
}

/**
 * reset button handler
 * ----------------
 */

function handleOptionsInit () {
	var message = $('opt-init-confirm').textContent;
	window.confirm(message) && extension.postMessage(
		{type:'reset-options'},
		function () {
			window.location.reload();
		}
	);
}

global.WasaviOptions = {
	get extension () {return extension},
	set extension (v) {extension = v},
	initPage: initPage
};

})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
