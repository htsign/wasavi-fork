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

/**
 * A command handler. Receives the application, its buffer and the parsed
 * arguments, with `this` bound to the owning ExCommand. Returns an error
 * message string, a Promise, or undefined; the `set` command is a generator.
 *
 * @typedef {(this: ExCommand, app: WasaviApp, t: WasaviEditor, a: WasaviExCommandArg) =>
 *   string | Promise<unknown> | void | Generator<unknown, void, unknown>} ExCommandHandler
 */

/**
 * A file-IO / messaging response delivered to a `chrome.runtime` port or
 * postMessage callback. Discriminated by `type` and `state`; any response may
 * instead carry an `error` (the handlers check it first).
 *
 * @typedef {{ error?: [string, ...unknown[]] } & (
 *   | { type?: undefined }
 *   | { type: 'fileio-authorize-response', phase?: string }
 *   | { type: 'write-response' | 'fileio-write-response', state: 'buffered', path: string }
 *   | { type: 'write-response' | 'fileio-write-response', state: 'writing', progress: number }
 *   | { type: 'write-response' | 'fileio-write-response', state: 'complete', meta: { path: string, bytes: number } }
 *   | { type: 'read-response' | 'fileio-read-response', state: 'reading', progress: number }
 *   | { type: 'read-response' | 'fileio-read-response', state: 'complete', content: string, meta: { path: string }, status: number }
 *   | { type: 'fileio-chdir-response', data: Record<string, unknown> }
 * )} FileIoResponse
 */

/**
 * Parsed `:write` argument, produced by parseWriteArg and consumed by writeCore.
 *
 * @typedef {object} WriteArg
 * @property {string} caller
 * @property {boolean} isCommand
 * @property {boolean} isAppend
 * @property {string} path
 * @property {boolean} [isBuffered]
 */

/**
 * Message payload posted to the writer (background script / parent frame /
 * page element). Members beyond the initial ones are stamped on per route.
 *
 * @typedef {object} WritePayload
 * @property {string} path
 * @property {unknown} isForce
 * @property {boolean | undefined} isBuffered
 * @property {string} value
 * @property {string} [type]
 * @property {unknown} [url]
 * @property {unknown} [writeAs]
 * @property {string} [encoding]
 */

/**
 * Options bag passed to `app.edit.paste`. The `content`/`register` members are
 * stamped on conditionally.
 *
 * @typedef {object} PasteOpts
 * @property {boolean} isForward
 * @property {boolean} lineOrientOverride
 * @property {string} [content]
 * @property {string} [register]
 */

/**
 * A single key-mapping rule (produced by a map handler's toArray).
 *
 * @typedef {object} MapRule
 * @property {string} lhs
 * @property {string} rhs
 * @property {{remap: boolean}} options
 */

/**
 * A key-map handler stored in `app.mapManager.maps`.
 *
 * @typedef {object} MapHandler
 * @property {string} name
 * @property {() => MapRule[]} toArray
 * @property {() => void} removeAll
 * @property {(lhs: string) => void} remove
 * @property {(lhs: string, rhs: string, allowRecursive: boolean) => void} register
 */

const EXFLAGS = {
	addr2All: 1<<2,
	addr2None: 1<<3,
	addrZero: 1<<4,
	addrZeroDef: 1<<5,
	printDefault: 1<<6,
	clearFlag: 1<<7,
	newScreen: 1<<8,
	roundMax: 1<<9,
	updateJump: 1<<10,
	multiAsync: 1<<11
};

class ExCommand {
	/**
	 * @param {string} name
	 * @param {string} shortName
	 * @param {string} syntax
	 * @param {number} flags
	 * @param {ExCommandHandler} handler
	 */
	constructor(name, shortName, syntax, flags, handler) {
		this.name = name;
		this.shortName = shortName;
		this.handler = handler;
		this.syntax = syntax;
		this.rangeCount = flags & 3;
		this.flags = {
			addr2All:     !!(flags & EXFLAGS.addr2All),
			addr2None:    !!(flags & EXFLAGS.addr2None),
			addrZero:     !!(flags & EXFLAGS.addrZero),
			addrZeroDef:  !!(flags & EXFLAGS.addrZeroDef),
			printDefault: !!(flags & EXFLAGS.printDefault),
			clearFlag:    !!(flags & EXFLAGS.clearFlag),
			roundMax:     !!(flags & EXFLAGS.roundMax),
			updateJump:   !!(flags & EXFLAGS.updateJump),
			multiAsync:   !!(flags & EXFLAGS.multiAsync)
		};
	}

	/** @returns {ExCommand} */
	clone() {
		return new ExCommand(
			this.name,
			this.shortName,
			this.syntax,
			JSON.parse(JSON.stringify(this.flags)),
			this.handler
		);
	}

	/**
	 * @param {WasaviApp} app
	 * @param {number[]} range
	 * @param {string} line
	 * @param {string} [syntax]
	 * @returns {WasaviExCommandArg | string}
	 */
	parseArgs(app, range, line, syntax) {
		/**
		 * @param {string} s
		 * @returns {string}
		 */
		function stripv(s) {
			return s.replace(/\u0016(.)/g, '$1');
		}
		/**
		 * @param {string} s
		 * @returns {string}
		 */
		function stripp(s) {
			return s.replace(/\\([^\/])/g, '$1');
		}
		/** @param {string | number} s */
		function push_string(s) {
			result.argv.push(/** @type {string} */ (s));
		}
		/** @param {string} s */
		function push_2words(s) {
			s = s.replace(/^\s+/, '');
			if (s == '') return;

			let re;

			// optional bracket attribute
			re = /^\[(?:\\\]|[^\]])*\]/.exec(s);
			if (re) {
				result.argv.push(stripp(re[0]));
				s = s.substring(re[0].length);
			}
			s = s.replace(/^\s+/, '');
			if (s == '') return;

			// first word
			re = /(?:\u0016.|\S)*/.exec(s);
			if (re) {
				result.argv.push(stripv(re[0]));
				s = s.substring(re[0].length)
			}
			s = s.replace(/^\s+/, '');
			if (s == '') return;

			// second word
			result.argv.push(stripv(s));
		}
		/** @param {string} s */
		function push_words(s) {
			var index = 0;
			var anchor = 0;
			var mode = 0;
			while (index < s.length) {
				switch (mode) {
				case 0:
					if (/\s/.test(s.charAt(index))) {
						if (index > anchor) {
							result.argv.push(
								s.substring(anchor, index)
									.replace(/\\(.)/g, '$1'));
						}
						mode = 1;
					}
					else if ('"\''.indexOf(s.charAt(index)) >= 0) {
						mode = s.charAt(index++) == '"' ? 2 : 3;
					}
					else {
						mode = 4;
					}
					break;
				case 1:
					while (index < s.length && /\s/.test(s.charAt(index))) {
						index++;
					}
					mode = 0;
					anchor = index;
					break;
				case 2:
					while (index < s.length && s.charAt(index) != '"') {
						index++;
					}
					if (s.charAt(index - 1) != '\\') {
						mode = 0;
					}
					index++;
					break;
				case 3:
					while (index < s.length && s.charAt(index) != "'") {
						index++;
					}
					if (s.charAt(index - 1) != '\\') {
						mode = 0;
					}
					index++;
					break;
				case 4:
					while (index < s.length) {
						if ((index == 0 || s.charAt(index - 1) != '\\')
						&& /[\s"']/.test(s.charAt(index))) {
							mode = 0;
							break;
						}
						index++;
					}
					break;
				}
			}
			if (index > anchor) {
				result.argv.push(
					s.substring(anchor, index)
						.replace(/\\(.)/g, '$1'));
			}
		}
		/** @param {string} s */
		function push_paths(s) {
			while ((s = s.replace(/^\s+/, '')) != '') {
				var re = /** @type {RegExpExecArray} */ (/(?:\\.|\S)*/.exec(s));
				result.argv.push(stripp(re[0]));
				s = s.substring(re[0].length);
			}
		}

		var t = app.buffer;
		var result = /** @type {WasaviExCommandArg} */ ({});
		var needCheckRest = true;
		syntax || (syntax = this.syntax);
		result.range = range;
		result.flagoff = 0;
		result.flags = {
			force:false,
			hash:false,
			list:false,
			print:false,
			dash:false,
			dot:false,
			plus:false,
			carat:false,
			equal:false,
			register:false,
			count:false
		};
		result.argv = [];

syntax_expansion_loop:
		for (var i = 0; i < syntax.length; i++) {
			var ch = syntax.charAt(i);

			if (ch == '!') {
				if (line.charAt(0) == '!') {
					line = line.substring(1);
					result.flags.force = true;
				}
				continue;
			}
			else if (ch == 'm') {
				var j = 0;
				if (this.name.length == 1) {
					while (line.charAt(j) == this.name) {j++;}
					line = line.substring(j);
				}
				push_string(j + 1);
				continue;
			}

			line = line.replace(/^\s+/, '');

			switch (ch) {
			case '1':
flag1_loop:
				for (var j = 0; j < line.length; j++) {
					switch (line.charAt(j)) {
					case '+':
						result.flagoff++;
						break;
					case '-':
					case '^':
						result.flagoff--;
						break;
					case '#':
						result.flags.hash = true;
						break;
					case 'l':
						result.flags.list = true;
						break;
					case 'p':
						result.flags.print = true;
						break;
					default:
						break flag1_loop;
					}
				}
				line = line.substring(j);
				break;

			case '2':
			case '3':
flag23_loop:
				for (var j = 0; j < line.length; j++) {
					switch (line.charAt(j)) {
					case '-':
						result.flags.dash = true;
						break;
					case '.':
						result.flags.dot = true;
						break;
					case '+':
						result.flags.plus = true;
						break;
					case '-':
						result.flags.carat = true;
						break;
					case '=':
						if (ch == '3') {
							result.flags.equal = true;
							break;
						}
						/* FALLTHRU */
					default:
						break flag23_loop;
					}
				}
				line = line.substring(j);
				break;

			case 'b':
				// [register name]
				if (line == '') {
					break syntax_expansion_loop;
				}
				if (/[+\-^#]+\s*$/.test(line) && syntax.indexOf('1') >= 0) {
					break;
				}
				if (/^\d/.test(line) && syntax.charAt(i + 1) == 'c' && !spc('S').test(line.charAt(1))) {
					break;
				}
				if (!app.registers.isReadable(line.charAt(0))) {
					return _('Invalid register name: {0}', line.charAt(0));
				};
				if (line.charAt(0) == '=') {
					result.register = line;
					line = '';
				}
				else {
					result.register = line.charAt(0);
					line = line.substring(1);
				}
				result.flags.register = true;
				break;

			case 'c':
				// [count]
				// c0: accepts a count that >= 0
				// c1: accepts a count that >= 1
				// c+: accepts preceding sign (optional), and a count that >= 1
				// ca: accepts a count that >= 1, and range will be adjusted
				ch = syntax.charAt(++i);
				if (line == '') {
					break syntax_expansion_loop;
				}

				var re = /^\d+/.exec(line);
				if (!re && ch == '+') {
					re = /^([\-+])\d+/.exec(line);
				}
				if (!re) {
					break;
				}
				line = line.substring(re[0].length);
				var count = parseInt(re[0], 10);
				if (isNaN(count)) {
					return _('Bad address.');
				}
				if (count == 0 && ch != '0') {
					return _('Count may not be zero.');
				}
				if (ch == 'a') {
					result.range[0] = result.range[1];
					result.range[1] = minmax(0, result.range[0] + count - 1, t.rowLength - 1);
				}
				result.count = count;
				result.flags.count = true;
				break;

			case 'f':
				// [path format string]
				push_paths(line);
				needCheckRest = false;
				break syntax_expansion_loop;

			case 'l':
				// [destination address]
				if (line == '') {
					break syntax_expansion_loop;
				}
				var dest = parseRange(app, line, 1, true);
				if (typeof dest == 'string') {
					return dest;
				}
				if (dest.rows.length == 0) {
					return _('Address not specified.');
				}
				if (typeof dest.rows == 'string') {
					return dest.rows;
				}
				if (dest.rows[0] >= t.rowLength) {
					return _('Wrong address specified.');
				}
				line = dest.rest;
				result.lineNumber = dest.rows[0];
				break;

			case 's':
				// [whole of string remain]
				push_string(line);
				needCheckRest = false;
				break syntax_expansion_loop;

			case 'W':
				// [option + 2 words]
				push_2words(line);
				needCheckRest = false;
				break syntax_expansion_loop;

			case 'w':
				// [word (count specified)]
				// wN:  accepts any number of words
				// w3o: requires 3 words, but accepts empty arg
				// w3r: requires 3 words
				push_words(line);
				ch = syntax.charAt(++i);
				if (/\d/.test(ch)) {
					var tmp = Number(ch);
					ch = syntax.charAt(++i);
					if ((ch != 'o' || result.argv.length != 0) && result.argv.length != tmp) {
						return _('Missing required argument.');
					}
				}
				needCheckRest = false;
				break syntax_expansion_loop;

			default:
				return _('Internal syntax table error.');
			}
		}

		if (needCheckRest) {
			line = line.replace(/^\s+/, '');
			if (line != '' || /[lr]/.test(syntax.substring(i))) {
				return _('Invalid argument.');
			}
		}

		return result;
	}

	/**
	 * @param {WasaviApp} app
	 * @param {number[]} range
	 * @param {string} commandNameOption
	 * @param {string[]} [argv]
	 * @param {string} [args]
	 * @param {string} [syntax]
	 * @returns {WasaviExCommandArg | string}
	 */
	buildArgs(app, range, commandNameOption, argv, args, syntax) {
		var result = this.parseArgs(app, range, commandNameOption, syntax);
		if (typeof result == 'string') {
			return this.name + ': ' + result;
		}
		if (argv instanceof Array) {
			argv.push.apply(argv, result.argv);
			result.argv = argv;
		}
		result.args = args || '';
		return result;
	}

	/**
	 * @param {WasaviApp} app
	 * @param {number[]} range
	 * @returns {number[] | string}
	 */
	fixupRange(app, range) {
		for (var i = 0, goal = range.length; i < goal; i++) {
			if (!this.flags.addrZero) {
				range[i] = Math.max(0, range[i]);
			}
			if (this.flags.roundMax) {
				range[i] = Math.min(app.buffer.rowLength - 1, range[i]);
			}
			else {
				if (range[i] >= app.buffer.rowLength) {
					return _('{0}: Out of range.', this.name);
				}
			}
		}
		return range;
	}

	/**
	 * @param {WasaviApp} app
	 * @param {WasaviExCommandArg} args
	 * @returns {string | {flags: WasaviExCommandArgFlags, offset: number, value: unknown}}
	 */
	run(app, args) {
		/** @type {unknown} */
		var result;
		try {
			var t = app.buffer;
			result = isGenerator(this.handler) ?
				execGenerator(this.handler, this, app, t, args) :
				this.handler(app, t, args);
		}
		catch (e) {
			result = `${e}`;
			app.low.notifyError(e);
		}
		if (typeof result == 'string') {
			return this.name + ': ' + result;
		}
		return {flags:args.flags, offset:args.flagoff, value:result};
	}

	/** @returns {string} */
	toString() {
		return '[ExCommand ' + this.name + ']';
	}
}

/**
 * @param {WasaviApp} app
 * @param {WasaviEditor} t
 * @param {WasaviExCommandArg} a
 * @param {string} caller
 * @returns {WriteArg}
 */
function parseWriteArg(app, t, a, caller) {
	/** @type {RegExpExecArray | null} */
	var re;
	var arg = a.argv[0] || '';
	var isCommand = false;
	var isAppend = false;
	var path = '';

	if ((re = /^\s*(?!\\)!(.*)/.exec(arg))) {
		isCommand = true;
		path = (re[1] || '').replace(/\\(.)/g, '$1');
	}
	else if ((re = /^\s*>>(.*)/.exec(arg))) {
		isAppend = true;
		path = (re[2] || '').replace(/\\(.)/g, '$1');
	}
	else if ((re = /\s*(.+)/.exec(arg))) {
		path = re[1].replace(/\\(.)/g, '$1');
	}
	else if (app.fileName != '') {
		path = app.fileName;
	}

	return {
		caller: caller,
		isCommand: isCommand,
		isAppend: isAppend,
		path: path
	};
}

/**
 * @param {WasaviApp} app
 * @param {WasaviEditor} t
 * @param {WasaviExCommandArg} a
 * @param {WriteArg} pa
 * @returns {string | Promise<unknown> | undefined}
 */
function writeCore(app, t, a, pa) {
	pa.path || (pa.path = app.fileName);
	var pathRegalized = app.low.regalizeFilePath(pa.path, true);

	if (pa.isCommand) {
		return _('Command redirection is not implemented.');
	}
	if (pa.path == '' && app.extensionChannel.isTopFrame()) {
		return _('No file name.');
	}
	if (pa.isAppend) {
		return _('Appending is not implemented.');
	}
	if (a.flags.force) {
		app.config.setData('noreadonly');
	}
	else {
		if (app.config.vars.readonly) {
			return _('Readonly option is set (use "!" to override).');
		}
	}

	var targetElement = /** @type {WasaviTargetElement} */ (app.targetElement);
	var newline = targetElement.elementType == 'contentEditable' ?
		'\n' : app.preferredNewline;
	var content = t.getValue(a.range[0], a.range[1], newline);

	/** @type {string} */
	var postType;
	/** @type {WritePayload} */
	var payload = {
		path:pathRegalized,
		isForce:a.flags.force,
		isBuffered:pa.isBuffered,
		value:content
	};

	// write into the element on a page
	if (payload.path == '') {
		switch (targetElement.elementType) {
		case 'body':
			payload.type = 'set-memorandum';
			payload.url = targetElement.url;
			postType = 'body';
			break;

		default:
			payload.writeAs = targetElement.writeAs;
			postType = 'element';
			break;
		}
	}

	// write into the online storage
	else {
		payload.type = 'write';
		payload.encoding = 'UTF-8';
		postType = 'storage';
	}

	// set file name and clear dirty flag, when writing the whole buffer
	if (a.range[0] == 0 && a.range[1] == t.rowLength - 1) {
		if (app.fileName == '') {
			app.fileName = pathRegalized;
		}
		if (pa.isBuffered) {
			app.isTextDirty = false;
		}
		app.editLogger.notifySave();
	}

	// call buffered writing.
	// response messages will be posted to chrome.runtime.onMessage listener.
	if (pa.isBuffered && postType == 'storage') {
		app.extensionChannel.postMessage(payload);
		return;
	}

	return new Promise(resolve => {
		/** @type {ChromeRuntimePort | undefined} */
		var port;

		/** @param {FileIoResponse} res */
		function handleResponse(res) {
			if (res.error) {
				if (port) {
					port.disconnect();
					port = undefined;
				}
				resolve(_.apply(null, res.error));
				return;
			}

			switch (res.type) {
			case 'fileio-authorize-response':
				app.low.showMessage(_('Obtaining access rights ({0})...', res.phase || '-'));
				break;

			case 'write-response':
			case 'fileio-write-response':
				switch (res.state) {
				case 'buffered':
					app.low.showMessage(_('Buffered: {0}', res.path));
					break;

				case 'writing':
					app.low.showMessage(_('Writing ({0}%)', res.progress.toFixed(2)));
					break;

				case 'complete':
					/** @type {unknown} */
					var result;

					app.isTextDirty = false;

					if (port) {
						port.disconnect();
						port = undefined;
					}

					if (/^(?:submit|wqs?|xit)$/.test(pa.caller)) {
						let quit = /** @type {ExCommand} */ (find('quit'));
						let caller = /** @type {ExCommand} */ (find(pa.caller));

						result = quit.handler.call(caller, app, t, a);
					}
					else {
						let meta = res.meta;
						let path = meta.path;
						let bytes = meta.bytes;
						let message = app.low.getFileIoResultInfo(path, bytes);

						app.low.requestShowMessage(_('Written: {0}', message));
						app.low.notifyActivity('', '', 'write handler completed');
					}

					resolve(result);
					break;
				}
			}
		}

		switch (postType) {
		case 'body':
			app.extensionChannel.postMessage(payload, handleResponse);
			break;

		case 'element':
			app.low.notifyToParent('write', payload, handleResponse);
			break;

		case 'storage':
			port = chrome.runtime.connect({name: 'fsctl'});
			port.onMessage.addListener(handleResponse);
			port.postMessage(payload);
			break;
		}
	});
}

/**
 * @param {WasaviApp} app
 * @param {WasaviEditor} t
 * @param {WasaviExCommandArg} a
 * @returns {unknown}
 */
function globalLatterHead(app, t, a) {
	var opcode = /** @type {WasaviExGlobalOpcode} */ (app.exvm.inst.currentOpcode);
	var items = opcode.items;

	if (app.exvm.lastError) {
		app.editLogger.close();
		return app.exvm.lastError;
	}

	var row = -1;
	while (items.length) {
		row = -1;
		var item = /** @type {Node} */ (items.shift());
		if (item.parentNode) {
			row = t.indexOf(item);
			if (0 <= row && row <= t.rowLength - 1) {
				break;
			}
		}
	}

	if (row >= 0) {
		t.setSelectionRange(t.getLineTopOffset2(new Wasavi.Position(row, 0)));
	}
	else {
		app.exvm.inst.errorVectors.pop();
		app.exvm.inst.index += opcode.nestLength;

		app.editLogger.close();
	}
}

/**
 * @param {WasaviApp} app
 * @param {WasaviEditor} t
 * @param {WasaviExCommandArg} a
 * @returns {void}
 */
function globalLatterBottom(app, t, a) {
	var opcode = /** @type {WasaviExGlobalOpcode} */ (app.exvm.inst.currentOpcode);
	app.exvm.inst.index -= opcode.nestLength - 1;
}

/**
 * @param {WasaviApp} app
 * @param {WasaviEditor} t
 * @param {WasaviExCommandArg} a
 * @param {unknown} content
 * @param {{path: string}} meta
 * @param {number} status
 * @returns {string | undefined}
 */
function readCore(app, t, a, content, meta, status) {
	if (typeof content != 'string' || status == 404) {
		return _('Cannot open "{0}".', meta.path);
	}
	if (content == '') {
		return _('"{0}" has no content.', meta.path);
	}
	content = content.replace(/\r\n|\r/g, '\n');
	var startLine = minmax(-1, a.range[0], t.rowLength - 1);
	t.setSelectionRange(new Wasavi.Position(startLine, 0));
	app.edit.paste(1, {
		isForward:true,
		lineOrientOverride:true,
		content:content
	});
	t.setSelectionRange(t.getLineTopOffset2(startLine + 1, 0));
}

/**
 * @param {WasaviApp} app
 * @param {WasaviEditor} t
 * @param {WasaviExCommandArg} a
 * @param {string} content
 * @param {{path: string}} meta
 * @param {number} status
 * @returns {string | undefined}
 */
function editCore(app, t, a, content, meta, status) {
	var charCount = content.length;
	if (app.extensionChannel.isTopFrame()) {
		app.fileName = meta.path;
		document.title = /** @type {RegExpExecArray} */ (/[^\/]+$/.exec(meta.path))[0] + ' - wasavi';
		/** @type {string[]} */
		var empty = [];
		app.preferredNewline = /** @type {[string, number][]} */ ([
			['\n',   (content.match(/(?:^|[^\r])\n/g) || empty).length],
			['\r',   (content.match(/\r(?!\n)/g) || empty).length],
			['\r\n', (content.match(/\r\n/g) || empty).length]
		]).sort(function (a, b) {return b[1] - a[1];})[0][0];
	}
	else {
		app.fileName = '';
		app.preferredNewline = '\n';
	}

	t.value = trimTerm(content.replace(/\r\n|\r/g, '\n'));
	app.isTextDirty = false;
	app.editLogger.close().clear().open('ex+edit');
	app.marks.clear();

	// +command
	if (a.initCommand) {
		var ex = app.exvm.clone();
		var compileResult = ex.inst.compile(a.initCommand);
		if (typeof compileResult == 'string') {
			return compileResult;
		}
		var locator = ex.inst.add(/** @param {WasaviApp} app @param {WasaviEditor} t @param {WasaviExCommandArg} a */ function (app, t, a) {
			t.setSelectionRange(t.getLineTopOffset2(t.rowLength - 1, 0));
		});

		locator.command.name = 'edit-locator';
		app.exvm.inst.insert(ex.inst.opcodes, app.exvm.inst.index + 1);
	}
	else {
		t.setSelectionRange(t.getLineTopOffset2(0, 0));
	}

	//
	app.low.requestShowMessage(app.low.getFileIoResultInfo(meta.path, charCount, status == 404));
}

/**
 * @this {ExCommand}
 * @param {WasaviApp} app
 * @param {WasaviEditor} t
 * @param {WasaviExCommandArg} a
 * @param {Record<string, unknown> | undefined} data
 * @returns {string | undefined}
 */
function chdirCore(app, t, a, data) {
	if (a.argv.length == 0) {
		return /** @type {string | undefined} */ (/** @type {ExCommand} */ (find('pwd')).handler.call(this, app, t, a));
	}
	if (!data || !('is_dir' in data)) {
		return _('Invalid chdir result.');
	}
	if (!data.is_dir) {
		return _('Cannot change current directory into a file.');
	}

	var drive = '';
	var path = /** @type {string} */ (a.argv[0]);
	var index = -1;

	path = app.low.extractDriveName(path, function ($0, d) {drive = d});
	index = drive == '' ? app.fileSystemIndex : app.low.getFileSystemIndex(drive);

	if (index < 0) {
		return _('Unknown drive name.');
	}

	app.fileSystemIndex = index;
	if (path != '') {
		app.fstab[index].cwd = app.low.regalizeFilePath(path, false);
	}
}

/**
 * @param {WasaviApp} app
 * @param {string | number | undefined} attributes
 * @param {Record<string, boolean>} options
 * @param {Record<string, unknown>} maps
 * @returns {boolean}
 */
function parseMapAttributes(app, attributes, options, maps) {
	let re = /^\[(.+)\]$/.exec(/** @type {string} */ (attributes));
	if (!re) return false;

	re[1].split(',').forEach(attr => {
		attr = attr.replace(/^\s+\|\s+$/g, '');

		switch (attr) {
		case 'clear':
		case 'final':
		case 'noremap':
		case 'all':
			options[attr] = true;
			break;

		case 'normal':
		case 'bound':
		case 'input':
			maps[attr] = app.mapManager.maps[attr];
			break;
		}
	});
	return true;
}

/**
 * @param {WasaviApp} app
 * @param {WasaviExCommandArg} a
 * @param {Record<string, unknown>} maps
 * @returns {void}
 */
function selectDefaultMaps(app, a, maps) {
	if (Object.keys(maps).length) return;

	if (a.flags.force) {
		maps.input = app.mapManager.maps.input;
	}
	else {
		maps.normal = app.mapManager.maps.normal;
		maps.bound = app.mapManager.maps.bound;
	}
}

/** @type {Record<string, ExCommand>} */
var cache = {};
/**
 * @param {string} name
 * @returns {ExCommand | null}
 */
/*public*/function find(name) {
	if (name in cache) {
		return cache[name];
	}

	var command = commands.filter(function (command) {return command.name == name})[0];
	if (command) {
		return cache[name] = command;
	}

	return null;
}

/**
 * @param {string} name
 * @param {string} shortName
 * @param {string} syntax
 * @param {number} flags
 * @param {ExCommandHandler} handler
 * @returns {ExCommand}
 */
/*public*/function createExCommand(name, shortName, syntax, flags, handler) {
	return new ExCommand(name, shortName, syntax, flags, handler);
}

/**
 * The `rows` accumulator built by parseRange: a number array augmented with a
 * `last` reducer and an optional `specifiedAddresses` count.
 *
 * @typedef {number[] & {
 *   last(t: WasaviEditor, count: number, isGlobal?: boolean): ExRangeRows | string,
 *   specifiedAddresses?: number
 * }} ExRangeRows
 */

/**
 * @param {WasaviApp} app
 * @param {string} s
 * @param {number} [requiredCount]
 * @param {boolean} [allowZeroAddress]
 * @returns {WasaviExParseRangeResult | string}
 */
/*public*/function parseRange(app, s, requiredCount, allowZeroAddress) {
	var t = app.buffer;
	var rows = /** @type {ExRangeRows} */ (/** @type {number[]} */ ([]));
	var ss = t.selectionStart;
	var error = '';
	/** @type {RegExpExecArray | null} */
	var re;

	if ((re = spc('^S*%').exec(s))) {
		rows.push(0, t.rowLength - 1);
		s = s.substring(re[0].length);
	}
	else {
		while (true) {
			s = s.replace(spc('^S+'), '');

			var found = false;
			var regexSpecified = false;

			if (s.charAt(0) == '.') {
				rows.push(t.selectionStartRow);
				s = s.substring(1);
				found = true;
			}
			else if (s.charAt(0) == '$') {
				rows.push(t.rowLength - 1);
				s = s.substring(1);
				app.isJumpBaseUpdateRequested = true;
				found = true;
			}
			else if ((re = /^\d+/.exec(s))) {
				var n = Number(re[0]) - 1;
				if (n < 0) {
					n = allowZeroAddress ? -1 : 0;
				}
				rows.push(n);
				s = s.substring(re[0].length);
				app.isJumpBaseUpdateRequested = true;
				found = true;
			}
			else if ((re = /^'(.)/.exec(s))) {
				if (!/^[a-z`'<>]$/.test(re[1])) {
					error = _('Invalid mark name.');
					break;
				}
				var mark = app.marks.get(re[1]);
				if (mark == undefined) {
					error = _('Mark {0} is undefined.', re[1]);
					break;
				}
				rows.push(mark.row);
				s = s.substring(re[0].length);
				app.isJumpBaseUpdateRequested = true;
				found = true;
			}
			else if ((re = /^\/((?:\\\/|[^\/])*)(?:\/|(?=\n$))/.exec(s))) {
				var pattern = re[1] == '' ? (app.lastRegexFindCommand.pattern || '') : re[1];
				var regex = pattern == '' ? null : app.low.getFindRegex(pattern);
				if (!regex) {
					if (re[1] == '' && pattern == '') {
						error = _('No previous search pattern.');
					}
					else {
						error = _('Invalid regex pattern.');
					}
					break;
				}

				regexSpecified = true;
				app.lastRegexFindCommand.push({direction:1});
				pattern != '' && app.lastRegexFindCommand.setPattern(pattern);

				app.motion.lineEnd('');
				var result = app.motion.findByRegexForward(regex);
				if (!result) {
					error = _('Pattern not found: {0}', pattern);
					break;
				}

				rows.push(/** @type {WasaviPosition} */ (t.linearPositionToBinaryPosition(result.offset)).row);
				s = s.substring(re[0].length);
				app.isJumpBaseUpdateRequested = true;
				found = true;
			}
			else if ((re = /^\?((?:\\\?|[^?])*)(?:\?|(?=\n$))/.exec(s))) {
				var pattern = re[1] == '' ? (app.lastRegexFindCommand.pattern || '') : re[1];
				var regex = pattern == '' ? null : app.low.getFindRegex(pattern);
				if (!regex) {
					if (re[1] == '' && pattern == '') {
						error = _('No previous search pattern.');
					}
					else {
						error = _('Invalid regex pattern.');
					}
					break;
				}
				regexSpecified = true;
				app.lastRegexFindCommand.push({direction:-1});
				pattern != '' && app.lastRegexFindCommand.setPattern(pattern);

				app.motion.lineStart('', true);
				var result = app.motion.findByRegexBackward(regex);
				if (!result) {
					error = _('Pattern not found: {0}', pattern);
					break;
				}

				rows.push(/** @type {WasaviPosition} */ (t.linearPositionToBinaryPosition(result.offset)).row);
				s = s.substring(re[0].length);
				app.isJumpBaseUpdateRequested = true;
				found = true;
			}
			else if ((re = /^[\+\-](\d*)/.exec(s))) {
				var offset = re[1] == '' ?
					(re[0].charAt(0) == '+' ? 1 : -1) :
					parseInt(re[0], 10);
				rows.push(t.selectionStartRow + offset);
				s = s.substring(re[0].length);
				found = true;
			}
			else if (rows.length) {
				rows.push(t.selectionStartRow);
				found = true;
			}

			if (found) {
				if ((re = /^\s*[\+\-](\d*)/.exec(s))) {
					var offset = re[1] == '' ?
						(re[0].charAt(0) == '+' ? 1 : -1) :
						parseInt(re[0], 10);
					rows.lastItem = /** @type {number} */ (rows.lastItem) + offset;
					if (regexSpecified) {
						app.lastRegexFindCommand.verticalOffset = offset;
					}
					s = s.substring(re[0].length);
				}

				if (/** @type {number} */ (rows.lastItem) < 0) {
					rows.lastItem = allowZeroAddress ? -1 : 0;
				}

				s = s.replace(spc('^S+'), '');
			}

			if (s.charAt(0) == ',') {
				if (rows.length == 0) {
					rows.push(t.selectionStartRow);
				}
				s = s.substring(1);
				!found && rows.push(t.selectionStartRow);
			}
			else if (s.charAt(0) == ';') {
				if (rows.length == 0) {
					rows.push(t.selectionStartRow);
				}
				if (/** @type {number} */ (rows.lastItem) > t.rowLength) {
					error = _('Out of range.');
					break;
				}
				t.setSelectionRange(new Wasavi.Position(/** @type {number} */ (rows.lastItem), 0));
				s = s.substring(1);
				!found && rows.push(t.selectionStartRow);
			}
			else {
				break;
			}
		}
	}

	/**
	 * @this {ExRangeRows}
	 * @param {WasaviEditor} t
	 * @param {number} count
	 * @param {boolean} [isGlobal]
	 * @returns {ExRangeRows | string}
	 */
	rows.last = function (t, count, isGlobal) {
		var result = /** @type {ExRangeRows} */ (/** @type {number[]} */ ([]));
		count = Math.min(count, 2);
		if (count == 1) {
			if (this.length >= 1) {
				result = /** @type {ExRangeRows} */ ([/** @type {number} */ (this.lastItem)]);
			}
			else {
				result = /** @type {ExRangeRows} */ ([t.selectionStartRow]);
			}
		}
		else if (count == 2) {
			if (this.length >= 2) {
				result = /** @type {ExRangeRows} */ ([ this[this.length - 2], this[this.length - 1] ]);
			}
			else if (this.length == 1) {
				result = /** @type {ExRangeRows} */ ([ this[0], this[0] ]);
			}
			else {
				if (isGlobal) {
					result = /** @type {ExRangeRows} */ ([0, t.rowLength - 1]);
				}
				else {
					result = /** @type {ExRangeRows} */ ([ t.selectionStartRow, t.selectionStartRow ]);
				}
			}
			if (result[1] < result[0]) {
				return _('The second address is smaller than the first.');
			}
		}
		result.specifiedAddresses = Math.min(this.length, 2);
		return result;
	};

	t.setSelectionRange(ss);

	return error || /** @type {WasaviExParseRangeResult} */ ({
		rows: requiredCount == undefined ? rows : rows.last(t, requiredCount),
		rest: s
	});
}

/*public*/var defaultCommand = new ExCommand(
	'$default', '$default', 'ca1', 2 | EXFLAGS.roundMax,
	function (app, t, a) {
		printRow(app, t, a.range[0], a.range[1], a.flags);
		t.setSelectionRange(t.getLineTopOffset2(new Wasavi.Position(a.range[1], 0)));
		a.flags.hash = a.flags.list = a.flags.print = false;
	}
);

/**
 * @param {WasaviApp} app
 * @param {WasaviEditor} t
 * @param {number} from
 * @param {number} to
 * @param {Record<string, boolean>} flags
 * @returns {void}
 */
/*public*/function printRow(app, t, from, to, flags) {
	/**
	 * @param {number} i
	 * @returns {string}
	 */
	function getLineNumber(i) {
		return ('     ' + (i + 1)).substr(-6) + '  ';
	}
	/** @returns {string} */
	function getLineNumberNull() {
		return '';
	}
	var lg = flags.hash ? getLineNumber : getLineNumberNull;
	if (flags.list) {
		/** @type {Record<number, string>} */
		var escapeReplacements = {
			7: '\\a', 8: '\\b', 9: '\\t', 10: '\\n', 11: '\\v', 12: '\\f', 13: '\\r', 92:'\\\\'
		};
		for (var i = from; i <= to; i++) {
			var line = toNativeControl(t.rows(i));
			/*
			 * char code
			 * \\   5c
			 * \a   07
			 * \b   08
			 * \t   09
			 * \n   0a
			 * \v   0b
			 * \f   0c
			 * \r   0d
			 */
			line = line.replace(/[\u0007\u0008\u000a-\u000d\\]/g, function (s) {
				return escapeReplacements[s.charCodeAt(0)];
			});
			line = line.replace(/[\u0000-\u0008\u0010-\u001f\u007f]/g, function (s) {
				return '\\' + ('00' + s.charCodeAt(0).toString(8)).substr(-3);
			});
			line = line.replace(/\$/g, '\\$');
			line = line + '$';
			app.backlog.push(lg(i) + line);
		}
	}
	else if (flags.hash || flags.print) {
		for (var i = from; i <= to; i++) {
			var line = t.rows(i);
			app.backlog.push(lg(i) + line);
		}
	}
	app.low.requestConsoleOpen();
}

/*public*/var commands = [
	new ExCommand('abbreviate', 'ab', 'W', 0, function (app, t, a) {
		/** @param {Record<string, WasaviAbbrevEntry>} ab */
		function dispAbbrev(ab) {
			const MIN_WIDTH = 3;
			const PAD_WIDTH = 4;

			var maxWidth = MIN_WIDTH;
			/** @type {(string | [string, string])[]} */
			var list = [];

			for (var i in ab) {
				var tmp = toVisibleString(i);
				list.push([tmp, i]);
				if (tmp.length > maxWidth) {
					maxWidth = tmp.length;
				}
			}
			if (list.length) {
				list = list.map(function (l) {
					return (ab[l[1]].final ? '       ' : '[final]') + ' ' +
						l[0] +
						multiply(' ', maxWidth - l[0].length + PAD_WIDTH) +
						toVisibleString(ab[l[1]].value);
				}).sort();

				list.unshift(
					_('*** abbreviations ***'),

					'        LHS' +
					multiply(' ', maxWidth - MIN_WIDTH + PAD_WIDTH) +
					'RHS',

					'        ' +
					multiply('-', MIN_WIDTH) +
					multiply(' ', maxWidth - MIN_WIDTH + PAD_WIDTH) +
					multiply('-', MIN_WIDTH));

				app.backlog.push(list);
			}
			else {
				app.backlog.push(_('No abbreviations are defined.'));
			}
			app.low.requestConsoleOpen();
		}

		var abbrevs = app.abbrevs;
		/** @type {string | undefined} */
		var lhs;
		/** @type {string | undefined} */
		var rhs;
		/** @type {string | undefined} */
		var option;
		lhs = a.argv.shift();
		if (/^\[.+\]$/.test(/** @type {string} */ (lhs))) {
			option = lhs;
			lhs = a.argv.shift();
		}
		rhs = a.argv.shift();

		// prior option
		switch (option) {
		case '[clear]':
			abbrevs.clear();
			return;
		}

		// no args: display all abbreviations currently defined
		if (lhs == undefined && rhs == undefined) {
			dispAbbrev(abbrevs);
		}

		// one arg: display abbreviaion which corresponds to lhs
		else if (lhs != undefined && rhs == undefined) {
			/** @type {Record<string, WasaviAbbrevEntry>} */
			var tmp = {};
			var tmpLhs = lhs.substr(-1) == '*' ? lhs.substring(0, lhs.length - 1) : null;

			for (var i in abbrevs) {
				if (tmpLhs && i.indexOf(tmpLhs) == 0
				||  !tmpLhs && i == lhs) {
					tmp[i] = abbrevs[i];
				}
			}

			dispAbbrev(tmp);
		}

		// two args: define new abbreviation
		else if (lhs != undefined && rhs != undefined) {
			if (!app.config.vars.iskeyword.test(lhs.substr(-1))) {
				return _('The keyword of abbreviation must end with a word character.');
			}

			abbrevs[lhs] = {
				final: option == '[final]' || option == '[noremap]',
				value: app.keyManager.insertFnKeyHeader(rhs)
			};
		}
	}),
	new ExCommand('cd', 'cd', 'f', 0, function (app, t, a) {
		return new Promise(resolve => {
			var port = chrome.runtime.connect({name: 'fsctl'});
			port.onMessage.addListener(/** @param {FileIoResponse} res */ res => {
				if (res.error) {
					port.disconnect();
					resolve(_.apply(null, res.error));
					return;
				}

				switch (res.type) {
				case 'fileio-authorize-response':
					app.low.showMessage(_('Obtaining access rights ({0})...', res.phase || '-'));
					break;

				case 'fileio-chdir-response':
					port.disconnect();
					resolve(chdirCore.call(this, app, t, a, res.data));
					break;
				}
			});
			port.postMessage({
				type: 'chdir',
				path: app.low.regalizeFilePath(a.argv[0], true)
			});
		});
	}),
	new ExCommand('chdir', 'chd', 'f', 0, function (app, t, a) {
		return /** @type {ExCommand} */ (find('cd')).handler.call(this, app, t, a);
	}),
	new ExCommand('copy', 'co', 'l1', 2 | EXFLAGS.printDefault, function (app, t, a) {
		var content = t.getValue(a.range[0], a.range[1], '\n');
		var lineNumber = /** @type {number} */ (a.lineNumber);
		t.setSelectionRange(new Wasavi.Position(lineNumber, 0));
		app.edit.paste(1, {
			isForward:true,
			lineOrientOverride:true,
			content:content
		});
		var copied = a.range[1] - a.range[0] + 1;
		if (copied >= app.config.vars.report) {
			app.low.requestShowMessage(_('Copied {0} {line:0}.', copied));
		}
		var finalRow = minmax(0, lineNumber + 1 + copied - 1, t.rowLength - 1);
		t.setSelectionRange(t.getLineTopOffset2(finalRow, 0));
		app.isEditCompleted = true;
	}),
	new ExCommand('delete', 'd', 'bca1', 2 | EXFLAGS.printDefault, function (app, t, a) {
		t.setSelectionRange(new Wasavi.Position(a.range[0], 0));
		t.isLineOrientSelection = true;
		var deleted = a.range[1] - a.range[0] + 1;
		app.edit.yank(deleted, true, a.flags.register ? /** @type {string} */ (a.register) : '');
		app.edit.deleteSelection();
		t.isLineOrientSelection = false;
		if (deleted >= app.config.vars.report) {
			app.low.requestShowMessage(_('Deleted {0} {line:0}.', deleted));
		}
		var n = new Wasavi.Position(Math.min(a.range[0], t.rowLength - 1), 0);
		t.setSelectionRange(t.getLineTopOffset2(n));
		app.isEditCompleted = true;
	}),
	new ExCommand('edit', 'e', '!f', 0, function (app, t, a) {
		if (!a.flags.force && app.isTextDirty) {
			return _('File is modified; write or use "!" to override.');
		}
		if (a.argv.length > 2) {
			return _('Too much arguments.');
		}

		var path = a.argv[0] || '';
		if (path.charAt(0) == '+') {
			a.initCommand = path.substring(1).replace(/\\(.)/g, '$1');
			path = a.argv[1] || '';
		}
		else {
			a.initCommand = '';
		}

		if (app.extensionChannel.isTopFrame()) {
			if (path == '' && app.fileName == '') {
				return _('File name is empty.');
			}
		}
		else {
			if (path != '') {
				return _('Only stand alone form can edit.');
			}
		}

		return new Promise(resolve => {
			/** @type {ChromeRuntimePort | undefined} */
			var port;
			/** @type {{path: unknown, type?: string, url?: unknown, encoding?: string}} */
			var payload = {
				path:app.low.regalizeFilePath(path, true) || app.fileName
			};

			/** @param {FileIoResponse} res */
			function handleResponse(res) {
				if (res.error) {
					if (port) {
						port.disconnect();
						port = undefined;
					}
					resolve(_.apply(null, res.error));
					return;
				}

				switch (res.type) {
				case 'fileio-authorize-response':
					app.low.showMessage(_('Obtaining access rights ({0})...', res.phase || '-'));
					break;

				case 'read-response':
				case 'fileio-read-response':
					switch (res.state) {
					case 'reading':
						app.low.showMessage(_('Reading ({0}%)', res.progress.toFixed(2)));
						break;

					case 'complete':
						if (port) {
							port.disconnect();
							port = undefined;
						}
						resolve(editCore(app, t, a, res.content, res.meta, res.status));
						break;
					}
					break;
				}
			}

			var targetElement = /** @type {WasaviTargetElement} */ (app.targetElement);

			// read from the element on a page
			if (payload.path == '') {
				switch (targetElement.elementType) {
				case 'body':
					payload.type = 'get-memorandum';
					payload.url = targetElement.url;
					app.extensionChannel.postMessage(payload, handleResponse);
					break;

				default:
					app.low.notifyToParent('read', payload, handleResponse);
					break;
				}
			}

			// read from the online storage
			else {
				payload.type = 'read';
				payload.encoding = 'UTF-8';

				port = chrome.runtime.connect({name: 'fsctl'});
				port.onMessage.addListener(handleResponse);
				port.postMessage(payload);
			}
		});
	}),
	new ExCommand('file', 'f', 'f', 0, function (app, t, a) {
		if (a.argv.length > 1) {
			return _('Too much arguments.');
		}
		if (a.argv.length == 1) {
			if (!app.extensionChannel.isTopFrame()) {
				return _('Only stand alone form can rename.');
			}

			var oldPath = app.low.splitPath(app.fileName, '\\');
			var newPath = app.low.splitPath(a.argv[0], '\\');

			if (a.argv[0] == '/'
			|| /[^\\]\/$/.test(a.argv[0])
			|| /^\.{1,2}$/.test(/** @type {string} */ (newPath.lastItem))) {
				newPath.push('');
			}

			if (newPath.lastItem == '') {
				if (oldPath.length == 0 || oldPath.lastItem == '') {
					return _('File name is empty.');
				}
				newPath.lastItem = oldPath.lastItem;
			}

			app.fileName = app.low.regalizeFilePath(
				newPath
					.map(function (a) {return a.replace(/\//g, '\\/')})
					.join('/'),
				true);
		}
		app.low.requestShowMessage(app.low.getFileInfo(true));
	}),
	new ExCommand('filesystem', 'files', 'wN', 0, function (app, t, a) {
		var fstab = app.fstab;
		/** @type {string[]} */
		var list = [];
		var command = (a.argv[0] || '').replace(/\u0016(.)/g, '$1');
		if (/^(?:de?f?a?u?l?t?)$/.test(command)) {
			if (a.argv.length <= 1) {
				app.low.requestShowMessage(
					_('default file system: {0}', fstab[app.fileSystemIndex].name));
			}
			else {
				var target = a.argv[1];
				fstab.some(function (fs, i) {
					if (fs.name == target) {
						app.fileSystemIndex = i;
						return true;
					}
					return false;
				});
			}
		}
		else if (/^(?:re?s?e?t?)$/.test(command)) {
			app.extensionChannel.postMessage({
				type:'fsctl',
				subtype:'reset',
				name:a.argv.length <= 1 ? null : a.argv[1]
			});
		}
		else if (/^(?:st?a?t?u?s?)$/.test(command)) {
			if (fstab.length) {
				list.push(_('*** available file systems ***'));
				var maxWidth = 0;
				fstab.forEach(function (fs) {
					maxWidth = Math.max(maxWidth, fs.name.length);
				});
				fstab.forEach(function (fs, i) {
					list.push(
						(app.fileSystemIndex == i ? '*' : ' ') +
						' ' + fs.name + multiply(' ', maxWidth - fs.name.length) +
						' ' + fs.cwd
					);
				})
				app.backlog.push(list);
				app.low.requestConsoleOpen();
			}
			else {
				return _('no available file systems.');
			}
		}
		else {
			if (command == '') {
				return _('Command not specified.');
			}
			else {
				return _('Unknown command.');
			}
		}
	}),
	new ExCommand('global', 'g', '!s', 2 | EXFLAGS.addr2All, function (app, t, a) {
		/**
		 * @param {string} text
		 * @param {number} textPreLength
		 * @returns {(number | Node)[] | string}
		 */
		function getItems(text, textPreLength) {
			/** @type {RegExpExecArray | null} */
			var re;
			/** @type {(number | Node)[]} */
			var items = [];
			var prevOffset;
			var prevRow;
			var nullNewline = {length:0};
			var pattern = /** @type {RegExp} */ (patternRegex);
			pattern.lastIndex = 0;
			if (inverted) {
				var rangeStartRow = t.indexOf(t.rowNodes(r[0]));
				re = pattern.exec(text);
				if (re) {
					var pos = pattern.lastIndex - re[0].length;
					var row, delta;
					row = /** @type {WasaviPosition} */ (t.linearPositionToBinaryPosition(pos + textPreLength)).row;
					items.push(row - rangeStartRow);
					prevOffset = pos;
					prevRow = row;

					while ((re = pattern.exec(text))) {
						if (pattern.lastIndex == prevOffset) {
							if (pattern.lastIndex < text.length) {
								pattern.lastIndex++;
								continue;
							}
							else {
								break;
							}
						}
						pos = pattern.lastIndex - re[0].length;
						delta = (text.substring(prevOffset, pos).match(/\n/g) || nullNewline).length;
						row = prevRow + delta;
						if (row > r[1]) break;
						delta && items.push(row - rangeStartRow);
						prevOffset = pos;
						prevRow = row;
					}

					if (items.length >= r[1] - r[0] + 1) {
						return _('Pattern found in every line: {0}', patternString);
					}
					/** @type {Node[]} */
					var tmp = [], container = t.elm;
					for (var i = r[0]; i <= r[1]; i++) {
						//tmp.push(container.childNodes[i]);
						tmp.push(t.rowNodes(i));
					}
					for (var i = items.length - 1; i >= 0; i--) {
						tmp.splice(/** @type {number} */ (items[i]), 1);
					}
					items = tmp;
				}
			}
			else {
				re = pattern.exec(text);
				if (re) {
					var pos = pattern.lastIndex - re[0].length;
					var row, delta;
					row = /** @type {WasaviPosition} */ (t.linearPositionToBinaryPosition(pos + textPreLength)).row;
					items.push(t.rowNodes(row));
					prevOffset = pos;
					prevRow = row;

					while ((re = pattern.exec(text))) {
						if (pattern.lastIndex == prevOffset) {
							if (pattern.lastIndex < text.length) {
								pattern.lastIndex++;
								continue;
							}
							else {
								break;
							}
						}
						pos = pattern.lastIndex - re[0].length;
						delta = (text.substring(prevOffset, pos).match(/\n/g) || nullNewline).length;
						row = prevRow + delta;
						if (row > r[1]) break;
						delta && items.push(t.rowNodes(row));
						prevOffset = pos;
						prevRow = row;
					}
				}
			}
			return items;
		}

		/*
		 * pick up all rows matches to regexp
		 */

		var r = a.range;
		var inverted = !!a.flags.force;
		/** @type {string} */
		var pattern = a.argv[0];
		var command = a.argv[1];

		if (pattern == '') {
			if (!app.registers.exists('/') || (pattern = app.registers.get('/').data) == '') {
				return _('No previous search pattern.');
			}
		}
		else {
			app.lastRegexFindCommand.push({direction:1});
			app.lastRegexFindCommand.setPattern(pattern);
			app.registers.set('/', app.lastRegexFindCommand.pattern);
		}
		var patternString = pattern;
		var patternRegex = app.low.getFindRegex(pattern);

		var textPreLength;
		/** @type {Range | null} */
		var rg = document.createRange();
		rg.setStartBefore(t.rowNodes(0));
		rg.setEndBefore(t.rowNodes(r[0]));
		textPreLength = rg.toString().length;
		rg = null;

		var text = t.getValue(r[0], r[1], '\n');
		if (r[1] == t.rowLength - 1) {
			text = trimTerm(text);
		}

		/*
		 * build up nested ex commands
		 */

		var ex = app.exvm.clone();
		var items = getItems(text, textPreLength);
		if (isString(items)) {
			return items;
		}

		// generate opcodes
		t.setSelectionRange(new Wasavi.Position(t.indexOf(/** @type {Node} */ (items[0])), 0));
		var head = ex.inst.add(globalLatterHead);
		var result = ex.inst.compile(command, this.name);
		var bottom = ex.inst.add(globalLatterBottom);
		if (isString(result)) {
			return result;
		}

		// additional properties for head
		head.items = items;
		head.nestLength = ex.inst.opcodes.length;
		head.command.name = this.name + '-head';

		// additional properties for bottom
		bottom.nestLength = ex.inst.opcodes.length;
		bottom.command.name = this.name + '-bottom';

		// merge into main queue of ex commands
		app.exvm.inst.insert(ex.inst.opcodes, app.exvm.inst.index + 1);
		app.exvm.inst.errorVectors.push(app.exvm.inst.index + 1);

		// start new edit log session
		app.marks.setJumpBaseMark(t.selectionStart);
		app.editLogger.open('ex+' + this.name);
	}),
	new ExCommand('join', 'j', '!c11', 2 | EXFLAGS.printDefault, function (app, t, a) {
		var head = a.range[0];
		var tail = Math.min(t.rowLength - 1, a.range[1] + (a.flags.count ? /** @type {number} */ (a.count) - 1 : 0));
		t.setSelectionRange(new Wasavi.Position(head, 0));
		app.edit.joinLines(tail - head, a.flags.force);
		t.setSelectionRange(t.getLineTopOffset2(head, 0));
		app.isEditCompleted = true;
	}),
	new ExCommand('k', 'k', 'w1r', 1, function (app, t, a) {
		return /** @type {ExCommand} */ (find('mark')).handler.call(this, app, t, a);
	}),
	new ExCommand('map', 'map', '!W', 0, function (app, t, a) {
		/**
		 * @param {MapRule[]} map
		 * @param {string} name
		 */
		function dispMap(map, name) {
			if (map.length) {
				let maxWidth = 0;
				let list = [_('*** {0} map ***', name)];
				map.map(function (o) {
					let lhs = toVisibleString(o.lhs);
					let rhs = toVisibleString(o.rhs);
					if (lhs.length > maxWidth) {
						maxWidth = lhs.length;
					}
					return o;
				})
				.forEach(function (o) {
					list.push(
						(o.options.remap ? '       ' : '[final]') + ' ' +
						o.lhs + multiply(' ', maxWidth - o.lhs.length) +
						'\t' + o.rhs);
				});
				app.backlog.push(list);
			}
			else {
				app.backlog.push(_('No rules for {0} map are defined.', name));
			}
			app.low.requestConsoleOpen();
		}

		let lhs = a.argv.shift();
		/** @type {string | undefined} */
		let rhs;
		/** @type {Record<string, boolean>} */
		let options = {};
		/** @type {Record<string, MapHandler>} */
		let maps = {};

		if (parseMapAttributes(app, lhs, options, maps)) {
			lhs = a.argv.shift();
		}

		rhs = a.argv.shift();
		selectDefaultMaps(app, a, maps);

		// 'clear' is a preferred option; remove all rules
		if ('clear' in options) {
			for (let i in maps) {
				maps[i].removeAll();
				app.backlog.push(_('All rules for {0} map have been cleared.', maps[i].name));
			}
			app.low.requestConsoleOpen();
		}

		// no args: display all of mapping rules
		else if (lhs == undefined && rhs == undefined) {
			let delimiter;
			for (let i in maps) {
				delimiter && app.backlog.push(delimiter);
				dispMap(maps[i].toArray(), maps[i].name);
				delimiter = ' ';
			}
		}

		// one arg: display current mapping rules which partially matches lhs
		else if (lhs != undefined && rhs == undefined) {
			let delimiter;
			for (let i in maps) {
				delimiter && app.backlog.push(delimiter);
				dispMap(maps[i].toArray().filter(o => o.lhs.indexOf(/** @type {string} */ (lhs)) >= 0), maps[i].name);
				delimiter = ' ';
			}
		}

		// two args: define new mapping rule
		else if (lhs != undefined && rhs != undefined) {
			// insert U+e000 in front of <...>
			lhs = app.keyManager.insertFnKeyHeader(lhs);
			rhs = app.keyManager.insertFnKeyHeader(rhs);

			let allowRecursive = !('final' in options || 'noremap' in options);
			let lhsSeq = app.keyManager.createSequences(lhs);

			// reject some mappings for input map: <escape>
			if ('input' in maps && lhsSeq.some(s => s.code == 0x1b)) {
				return _('Key {0} cannot be remapped.', toVisibleString(lhs));
			}

			// reject some mappings for normal map: <escape>, ":"
			if ('normal' in maps && lhsSeq.some(s => s.code == 0x1b || s.code == 0x3a)) {
				return _('Key {0} cannot be remapped.', toVisibleString(lhs));
			}

			for (let i in maps) {
				maps[i].register(lhs, rhs, allowRecursive);
			}
		}
	}),
	new ExCommand('mark', 'ma', 'w1r', 1, function (app, t, a) {
		var name = a.argv[0];
		if (name.length > 1) {
			return _('Mark names must be a single character.');
		}
		if (!app.marks.isValidName(name)) {
			return _('Invalid mark name.');
		}
		app.marks.set(name, new Wasavi.Position(a.range[0], 0));
	}),
	new ExCommand('marks', 'marks', '', 0, function (app, t, a) {
		app.backlog.push(app.marks.dump());
		app.low.requestConsoleOpen();
	}),
	new ExCommand('move', 'm', 'l', 2 | EXFLAGS.printDefault, function (app, t, a) {
		var r = a.range;
		var dest = /** @type {number} */ (a.lineNumber);
		if (dest >= r[0] && dest < r[1]) {
			return _('Destination is in inside source.');
		}
		app.editLogger.open('ex+move', function () {
			var rows = r[1] - r[0] + 1;

			if (dest == r[0] - 1 || dest == r[1]) {
				app.editLogger.write(Wasavi.EditLogger.ITEM_TYPE.NOP);
			}
			else {
				// delete
				t.isLineOrientSelection = true;
				t.setSelectionRange(new Wasavi.Position(r[0], 0));
				t.selectRowsLinewise(rows);
				var content = t.getSelectionLinewise();
				app.edit.deleteSelection();
				t.isLineOrientSelection = false;

				// fix destination position
				dest -= dest > r[1] ? rows : 0;

				// paste
				t.setSelectionRange(new Wasavi.Position(dest, 0));
				app.edit.paste(1, {
					isForward:true,
					lineOrientOverride:true,
					content:content
				});
			}

			if (rows >= app.config.vars.report) {
				app.low.requestShowMessage(_('Moved {0} {line:0}.', rows));
			}

			t.setSelectionRange(t.getLineTopOffset2(Math.min(t.rowLength - 1, dest + rows), 0));
		});
		app.isEditCompleted = true;
	}),
	new ExCommand('options', 'opt', '', 0, function (app, t, a) {
		app.extensionChannel.postMessage({type:'open-options'});
	}),
	new ExCommand('pwd', 'pw', '', 0, function (app, t, a) {
		var fstab = app.fstab;
		var fileSystemIndex = app.fileSystemIndex;
		app.low.requestShowMessage(
			fstab[fileSystemIndex].name +
			':' +
			fstab[fileSystemIndex].cwd);
	}),
	new ExCommand('print', 'p', 'ca1', 2 | EXFLAGS.clearFlag, function (app, t, a) {
		a.flags.print = true;
		return defaultCommand.handler.call(this, app, t, a);
	}),
	new ExCommand('put', 'pu', 'b', 1 | EXFLAGS.printDefault | EXFLAGS.addrZero | EXFLAGS.addrZeroDef, function (app, t, a) {
		var register = a.flags.register ? /** @type {string} */ (a.register) : '"';
		/** @type {PasteOpts} */
		var opts = {
			isForward:true,
			lineOrientOverride:true
		};

		function doput() {
			t.setSelectionRange(new Wasavi.Position(minmax(-1, a.range[0], t.rowLength - 1), 0));
			app.edit.paste(1, opts);
			t.setSelectionRange(t.getLineTopOffset2(Math.max(0, t.selectionStartRow), 0));
		}

		if (register.charAt(0) == '=') {
			var expressionString;
			if (register.length == 1) {
				if (!app.registers.exists(register)) {
					return _('Register {0} is empty.', register);
				}
				expressionString = app.registers.get(register).data;
			}
			else {
				expressionString = register.substring(1);
			}

			var v = expr(expressionString);
			if (v.error) {
				return v.error;
			}

			opts.content = /** @type {string} */ (/** @type {unknown} */ (v.result));
			register = register.charAt(0);
			app.registers.get('=').set(expressionString);

			return doput();
		}

		else if (!app.registers.isClipboard(register)) {
			if (!app.registers.exists(register)) {
				return _('Register {0} is empty.', register);
			}

			opts.register = register;

			return doput();
		}

		else {
			return new Promise(resolve => {
				app.extensionChannel.getClipboard(/** @param {unknown} text */ text => {
					app.registers.get('*').set(text);

					if (text == '') {
						resolve(_('Register {0} is empty.', register));
					}
					else {
						opts.register = register;
						resolve(doput());
					}
				});
			});
		}
	}),
	new ExCommand('quit', 'q', '!', 0, function (app, t, a) {
		if (/^(?:wqs|submit)$/.test(this.name)) {
			/** @type {WasaviTargetElement} */ (app.targetElement).isSubmitRequested = true;
		}
		if (a.flags.force) {
			app.isTextDirty = false;
			app.terminated = true;
		}
		else {
			if (app.isTextDirty) {
				return _('The text has been modified; use :quit! to discard any changes.');
			}
			else {
				app.terminated = true;
			}
		}
	}),
	new ExCommand('read', 'r', 'f', 1 | EXFLAGS.addrZero | EXFLAGS.addrZeroDef, function (app, t, a) {
		var path = a.argv[0] || '';
		if (path == '' && app.fileName == '') {
			return _('File name is empty.');
		}

		return new Promise(resolve => {
			var port = chrome.runtime.connect({name: 'fsctl'});
			port.onMessage.addListener((/** @type {FileIoResponse} */ res) => {
				if (res.error) {
					port.disconnect();
					resolve(_.apply(null, res.error));
					return;
				}

				switch (res.type) {
				case 'fileio-authorize-response':
					app.low.showMessage(_('Obtaining access rights ({0})...', res.phase || '-'));
					break;

				case 'fileio-read-response':
					switch (res.state) {
					case 'reading':
						app.low.showMessage(_('Reading ({0}%)', res.progress.toFixed(2)));
						break;

					case 'complete':
						port.disconnect();
						resolve(readCore(app, t, a, res.content, res.meta, res.status));
						break;
					}
					break;
				}
			});
			port.postMessage({
				type: 'read',
				encoding: 'UTF-8',
				path: app.low.regalizeFilePath(path, true) || app.fileName
			});
		});
	}),
	new ExCommand('redo', 're', '', 0, function (app, t, a) {
		app.editLogger.close();
		var result = app.editLogger.redo();
		app.editLogger.open('ex+redo');
		if (result === false) {
			return _('No redo item.');
		}
		else {
			app.low.requestShowMessage(
				_('{0} {operation:0} have executed again.', result));
		}
	}),
	new ExCommand('s', 's', 's', 2, function (app, t, a) {
		var pattern = '';
		if (this.name == '~') {
			if (!app.registers.exists('/')
			|| (pattern = app.registers.get('/').data) == '') {
				return _('No previous search pattern.');
			}
		}

		/** @type {Record<string, [number[], string, string, string]>} */
		var argmap = {
			's': [a.range, a.argv[0], a.argv[1], a.argv[2]],
			'&': [a.range, '',        '%',       a.argv[0]],
			'~': [a.range, pattern, '~', a.argv[0]]
		};
		var worker = new Wasavi.SubstituteWorker(app);

		return worker.run.apply(worker, /** @type {[[number, number], string, string, string]} */ (argmap[this.name]));
	}),
	new ExCommand('&', '&', 's', 2, function (app, t, a) {
		return /** @type {ExCommand} */ (find('s')).handler.call(this, app, t, a);
	}),
	new ExCommand('~', '~', 's', 2, function (app, t, a) {
		return /** @type {ExCommand} */ (find('s')).handler.call(this, app, t, a);
	}),
	new ExCommand('script', 'sc', 's', 2, function (app, t, a) {
		return 'Under development!';
	}),
	new ExCommand('set', 'se', 'wN', 0, function* (app, t, a) {
		/** @type {string[]} */
		var messages = [];
		var emphasis = false;
		if (a.argv.length == 0) {
			messages = app.config.dump(app.backlog.cols);
		}
		else if (a.argv.some(function (o) {return o == 'all';})) {
			messages = app.config.dump(app.backlog.cols, true);
		}
		else if (a.argv.some(function (o) {return /^all&(default|exrc)?$/.test(o)})) {
			switch (RegExp.$1) {
			case '':
			case 'default':
				app.config.reset();
				messages = [_('All options are reset to {0}.', 'default')];
				break;

			case 'exrc':
				app.config.loadSnapshot('exrc');
				messages = [_('All options are reset to {0}.', RegExp.$1)];
				break;
			}
		}
		else {
			messages = [];
			var opcode = app.exvm.inst.currentOpcode;

			for (var i = 0; i < a.argv.length; i++) {
				var arg = a.argv[i];
				var re = /^([^=?!]+)([=?!]|&(?:default|exrc)?)/.exec(arg) || ['', arg, ''];
				var info = app.config.getInfo(re[1]);
				if (!info) {
					messages.push(_('Unknown option: {0}', re[1]));
					emphasis = true;
					continue;
				}

				// query
				if (re[2] == '?'
				|| i + 1 < a.argv.length && a.argv[i + 1] == '?') {
					messages.push(app.config.getData(re[1], true));
					re[2] != '?' && i++;
				}

				// reset
				else if (re[2].charAt(0) == '&'
				|| i + 1 < a.argv.length && a.argv[i + 1].charAt(0) == '&') {
					if (re[2].charAt(0) != '&') {
						re[2] = a.argv[i + 1];
						i++;
					}

					switch (re[2]) {
					case '&':
					case '&default':
						app.config.reset(re[1]);
						break;

					case '&exrc':
						app.config.loadSnapshot('exrc', re[1]);
						break;
					}
				}

				// others
				else {
					// "set foo =bar" -> "set foo=bar"
					if (re[2] == ''
					&& i + 1 < a.argv.length
					&& a.argv[i + 1].charAt(0) == '=') {
						re[0] = arg + '=';
						arg += a.argv[++i];
						re[2] = '=';
					}
					// mark whether inverted flag is specified
					if ('inv' + info.name == re[1]) {
						re[2] = '!';
					}
					// alternative query form if non-boolean
					if (re[2] == '' && info.type != 'b') {
						messages.push(app.config.getData(re[1], true));
					}
					// assignment
					else {
						/** @type {string | undefined} */
						var value = undefined;
						if (re[2] == '=') {
							value = arg.substring(re[0].length);
							'\'"'.split('').some(function (q) {
								var s = /** @type {string} */ (value);
								if (s.charAt(0) != q) return;
								value = s.substr(-1) == q ?
									s.substring(1, s.length - 1) :
									undefined;
								return true;
							});
							if (value == undefined) {
								messages.push(_('Incomplete quoted value: {0}', arg));
								emphasis = true;
								break;
							}
						}
						else if (re[2] == '!') {
							re[1] = 'inv' + info.name;
						}

						var result = app.config.setData(re[1], value);
						if (typeof result == 'string') {
							messages.push(result.replace(/\.$/, '') + ': ' + arg);
							emphasis = true;
							break;
						}

						// wait its completion if async item
						else if (result instanceof Promise) {
							yield result;
						}
					}
				}
			}
		}
		// if messages exists...
		if (messages.length) {
			// one line only
			if (messages.length == 1 && !app.backlog.visible) {
				app.low.requestShowMessage(messages[0], emphasis);
				app.low.requestConsoleClose();
			}
			// multiple messages
			else {
				app.backlog.push(messages);
				app.low.requestConsoleOpen();
				//app.backlog.open();
				//yield execGenerator(backlog.loop, backlog);
			}
		}
		// messages is empty. request closing the console
		else {
			app.low.requestConsoleClose();
		}
	}),
	new ExCommand('sort', 'sor', '!s', 2 | EXFLAGS.addr2All, function (app, t, a) {
		var worker = new Wasavi.SortWorker(app, t, a);

		var result;
		result = worker.parseArgs();
		if (isString(result)) return result;

		result = worker.buildContent();
		if (isString(result)) return result;

		result = worker.sort();
		if (isString(result)) return result;

		var marks = app.marks.dumpData();
		app.editLogger.open('ex+sort', function () {
			t.isLineOrientSelection = true;
			t.setSelectionRange(new Wasavi.Position(a.range[0], 0));
			t.selectRowsLinewise(worker.rows);
			app.edit.deleteSelection();
			t.isLineOrientSelection = false;

			t.setSelectionRange(new Wasavi.Position(a.range[0] - 1, 0));
			app.edit.paste(1, {
				isForward:true,
				lineOrientOverride:true,
				content:worker.getContent()
			});

			for (var i in marks) {
				var m = marks[i];
				if (a.range[0] <= m.row && m.row <= a.range[1]) {
					app.marks.set(i, new Wasavi.Position(m.row, m.col));
				}
			}

			if (worker.rows >= app.config.vars.report) {
				app.low.requestShowMessage(_('Sorted {0} {line:0}.', worker.rows));
			}

			t.setSelectionRange(t.getLineTopOffset2(a.range[0], 0));
			app.isEditCompleted = true;
		});
	}),
	new ExCommand('sushi', 'sushi', 's', 0, function (app, t, a) {
		switch (a.argv[0]) {
		case 'reset-search-info':
			app.lastRegexFindCommand.push({});
			app.lastRegexFindCommand.setPattern('');
			app.lastSubstituteInfo.clear();
			break;
		case 'dump-undo-info':
			console.log([
				'*** undo info ***',
				app.editLogger.dump(),
				'item length: ' + app.editLogger.logLength,
				'current pos: ' + app.editLogger.currentPosition
			].join('\n'));
			break;
		case 'dump-options-doc':
			app.extensionChannel.setClipboard(app.config.dumpData());
			break;
		}
		app.low.requestShowMessage('Whassup?');
	}),
	new ExCommand('submit', 'sub', '!s', 2 | EXFLAGS.addr2All | EXFLAGS.addrZeroDef, function (app, t, a) {
		return /** @type {ExCommand} */ (find('write')).handler.call(this, app, t, a);
	}),
	new ExCommand('registers', 'reg', '', 0, function (app, t, a) {
		app.backlog.push(app.registers.dump());
		app.low.requestConsoleOpen();
	}),
	new ExCommand('reload', 'rel', '', 0, function (app, t, a) {
		if (app.isTestMode) {
			app.low.requestShowMessage('Reloading now...');
			app.low.notifyToParent('reload');
		}
	}),
	new ExCommand('to', 't', 'l1', 2 | EXFLAGS.printDefault, function (app, t, a) {
		return /** @type {ExCommand} */ (find('copy')).handler.call(this, app, t, a);
	}),
	new ExCommand('unabbreviate', 'una', 'w1r', 0, function (app, t, a) {
		var abbrevs = app.abbrevs;
		var lhs = a.argv[0];
		if (lhs == '[all]') {
			abbrevs.clear();
		}
		else if (!(lhs in abbrevs)) {
			return _('{0} is not an abbreviation.', lhs);
		}
		else {
			delete abbrevs[lhs];
		}
	}),
	new ExCommand('undo', 'u', '', 0 | EXFLAGS.updateJump, function (app, t, a) {
		app.editLogger.close();
		var result = app.editLogger.undo();
		app.editLogger.open('ex+undo');
		if (result === false) {
			return _('No undo item.');
		}
		else {
			app.low.requestShowMessage(
				_('{0} {operation:0} have reverted.', result));
		}
	}),
	new ExCommand('unmap', 'unm', '!W', 0, function (app, t, a) {
		let lhs = a.argv.shift();
		/** @type {Record<string, boolean>} */
		let options = {};
		/** @type {Record<string, MapHandler>} */
		let maps = {};

		if (parseMapAttributes(app, lhs, options, maps)) {
			lhs = a.argv.shift();
		}

		selectDefaultMaps(app, a, maps);

		if ('all' in options) {
			// 'all' is a preferred option: remove all rules
			for (let i in maps) {
				maps[i].removeAll();
				app.backlog.push(_('All rules for {0} map have been cleared.', maps[i].name));
			}
			app.low.requestConsoleOpen();
		}
		else {
			// remove the rule corresponding to lhs
			for (let i in maps) {
				maps[i].remove(/** @type {string} */ (lhs));
			}
		}
	}),
	new ExCommand('version', 've', '', 0, function (app, t, a) {
		app.low.requestShowMessage('wasavi/' + app.version);
	}),
	new ExCommand('v', 'v', 's', 2 | EXFLAGS.addr2All | EXFLAGS.updateJump, function (app, t, a) {
		a.flags.force = true;
		return /** @type {ExCommand} */ (find('global')).handler.call(this, app, t, a);
	}),
	new ExCommand('write', 'w', '!s', 2 | EXFLAGS.addr2All | EXFLAGS.addrZeroDef, function (app, t, a) {
		var parsedArgs = parseWriteArg(app, t, a, this.name);
		if (typeof parsedArgs == 'string') return parsedArgs;

		var result;
		if (this.name == 'write'
		&& (parsedArgs.path != '' || app.fileName != '')
		&& app.exvm.inst.index >= app.exvm.inst.opcodes.length - 2) {
			// Last "write" command that tries to write to a cloud storage;
			// do buffered writing.
			// command is completed immediately.
			parsedArgs.isBuffered = true;
			result = writeCore(app, t, a, parsedArgs);
		}
		else if (this.name == 'xit' && !app.isTextDirty) {
			// Because text is not modified, "xit" command is
			// consequently equivalent to "quit" command.
			result = /** @type {ExCommand} */ (find('quit')).handler.call(this, app, t, a);
		}
		else {
			// Other patterns are sequenced "write" command;
			// write immediately and wait its termination
			parsedArgs.isBuffered = false;
			result = writeCore(app, t, a, parsedArgs);
		}

		return result;
	}),
	new ExCommand('wq', 'wq', '!s', 2 | EXFLAGS.addr2All | EXFLAGS.addrZeroDef, function (app, t, a) {
		return /** @type {ExCommand} */ (find('write')).handler.call(this, app, t, a);
	}),
	new ExCommand('wqs', 'wqs', '!s', 2 | EXFLAGS.addr2All | EXFLAGS.addrZeroDef, function (app, t, a) {
		return /** @type {ExCommand} */ (find('write')).handler.call(this, app, t, a);
	}),
	new ExCommand('xit', 'x', '!s', 2 | EXFLAGS.addr2All | EXFLAGS.addrZeroDef, function (app, t, a) {
		return /** @type {ExCommand} */ (find('write')).handler.call(this, app, t, a);
	}),
	new ExCommand('yank', 'ya', 'bca', 2, function (app, t, a) {
		var p = t.selectionStart;
		t.setSelectionRange(new Wasavi.Position(a.range[0], 0));
		app.edit.yank(a.range[1] - a.range[0] + 1, true, a.flags.register ? /** @type {string} */ (a.register) : '');
		t.setSelectionRange(p);
	}),
	new ExCommand('>', '>', 'mca1', 2, function (app, t, a) {
		t.setSelectionRange(new Wasavi.Position(a.range[0], 0));
		app.edit.shift(a.range[1] - a.range[0] + 1, /** @type {number} */ (/** @type {unknown} */ (a.argv[0])));
		t.setSelectionRange(t.getLineTopOffset2(a.range[1], 0));
	}),
	new ExCommand('<', '<', 'mca1', 2, function (app, t, a) {
		t.setSelectionRange(new Wasavi.Position(a.range[0], 0));
		app.edit.unshift(a.range[1] - a.range[0] + 1, /** @type {number} */ (/** @type {unknown} */ (a.argv[0])));
		t.setSelectionRange(t.getLineTopOffset2(a.range[1], 0));
	}),
	new ExCommand('@', '@', 'b', 1, function (app, t, a) {
		/** @type {string | undefined} */
		var command;
		var register = '';

		if (a.flags.register) {
			register = a.register ?? '';
		}
		else {
			if (!app.registers.exists('@')) {
				return _('No previous execution.');
			}

			register = app.registers.get('@').data;
			if (register == '') {
				return _('No previous execution.');
			}
		}

		if (register == '@'
		|| !app.registers.isReadable(register)) {
			return _('Invalid register name: {0}', register);
		}

		if (app.exvm.executedRegisterFlags[register]) {
			return _('Register {0} was used recursively.', register);
		}

		function doexec() {
			var ex = app.exvm.clone();
			t.setSelectionRange(new Wasavi.Position(a.range[0], 0));
			var result = ex.inst.compile(command);
			if (typeof result == 'string') {
				return result;
			}

			app.exvm.inst.insert(ex.inst.opcodes, app.exvm.inst.index + 1);
			app.exvm.executedRegisterFlags[register] = true;
			app.registers.get('@').set(register);
		}

		if (register.charAt(0) == '=') {
			var expression;

			if (register.length == 1) {
				if (!app.registers.exists(register)) {
					return _('Register {0} does not exist.', register);
				}

				expression = app.registers.get(register).data;
				if (expression == '') {
					return _('Register {0} is empty.', register);
				}
			}
			else {
				expression = register.substring(1);
			}

			var v = expr(expression);
			if (v.error) {
				return v.error;
			}

			command = /** @type {string} */ (/** @type {unknown} */ (v.result));
			register = register.charAt(0);
			app.registers.get('=').set(expression);

			return doexec();
		}

		else if (!app.registers.isClipboard(register)) {
			if (!app.registers.exists(register)) {
				return _('Register {0} does not exist.', register);
			}

			command = app.registers.get(register).data;
			if (command == '') {
				return _('Register {0} is empty.', register);
			}

			return doexec();
		}

		else {
			return new Promise(resolve => {
				app.extensionChannel.getClipboard(/** @param {unknown} text */ text => {
					app.registers.get('*').set(text);

					if (text == '') {
						resolve(_('Register {0} is empty.', register));
					}
					else {
						resolve(doexec());
					}
				});
			});
		}
	}),
	new ExCommand('*', '*', 'b', 1, function (app, t, a) {
		return /** @type {ExCommand} */ (find('@')).handler.call(this, app, t, a);
	})
].sort(function (a, b) {return a.name.length - b.name.length;});

Wasavi.ExCommand = Object.freeze({
	find: find,
	create: createExCommand,
	parseRange: parseRange,
	defaultCommand: defaultCommand,
	printRow: printRow,
	commands: commands
});

})(typeof globalThis == 'object' ? globalThis : window);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker fmr=<<<,>>> :
