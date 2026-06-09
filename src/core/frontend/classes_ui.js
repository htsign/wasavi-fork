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

// methods are attached via publish(this, ...), which tsc cannot model;
// assert the constructor shape declared in wasavi-namespace.d.ts.
Wasavi.Theme = /** @type {new (app: WasaviApp) => WasaviTheme} */ (/** @type {unknown} */ (
	/** @param {WasaviApp} app */
	function (app) {
	/** @type {HTMLElement | null} */
	var container;
	/** @type {string} */
	var fontStyle;
	/** @type {number} */
	var lineHeight;
	/** @type {boolean} */
	var useStripe;
	/** @type {string} */
	var currentColorSetName;
	/** @type {Record<string, string | number | [string, string]>} */
	var colors = {
		statusHue:-1,
		background:'',
		overTextMarkerFg:'',
		warnedStatusFg:'', warnedStatusBg:'',
		invertFg:'', invertBg:'',
		blurFg:'', blurBg:'',

		rowBgOdd:['#wasavi_editor>div:nth-child(4n+3)', ''],
		editCursorFg:['#wasavi_edit_cursor', ''],
		statusFg:['#wasavi_footer', ''],
		lineNumberFg:['#wasavi_editor>div:before', ''],
		lineNumberBg:['#wasavi_editor>div:before', ''],
		rowFg:['#wasavi_editor>div', ''],
		rowBg:['#wasavi_editor>div', ''],
		highlightFg:['#wasavi_editor>div span.' + Wasavi.EMPHASIS_CLASS, ''],
		highlightBg:['#wasavi_editor>div span.' + Wasavi.EMPHASIS_CLASS, ''],
		lineInputFg:['#wasavi_footer_input,#wasavi_footer_input_indicator', ''],
		lineInputBg:['#wasavi_footer_input,#wasavi_footer_input_indicator', ''],
		consoleFg:['#wasavi_console', ''],
		consoleBg:['#wasavi_console_container', ''],
		boundFg:['#wasavi_editor>div span.' + Wasavi.BOUND_CLASS, ''],
		boundBg:['#wasavi_editor>div span.' + Wasavi.BOUND_CLASS, '']
	};
	/** @type {Record<string, Record<string, string>>} */
	var colorSets = {
		solarized: {
			statusHue:'#eee8d5',
			background:'#fdf6e3',
			overTextMarkerFg:'#93a1a1',
			warnedStatusFg:'#fdf6e3', warnedStatusBg:'#dc322f',
			invertFg:'#fdf6e3', invertBg:'#657b83',
			blurFg:'#fdf6e3', blurBg:'#eee8d5',

			rowBgOdd:'#fdf6e3',
			editCursorFg:'#657b83',
			statusFg:'#586e75',
			lineNumberFg:'#93a1a1', lineNumberBg:'#eee8d5',
			rowFg:'#657b83', rowBg:'#fdf6e3',
			highlightFg:'#fdf6e3', highlightBg:'#93a1a1',
			lineInputFg:'#fdf6e3', lineInputBg:'rgba(0,0,0,0.5)',
			consoleFg:'#fdf6e3', consoleBg:'rgba(0,0,0,0.8)',
			boundFg:'#fdf6e3', boundBg:'#93a1a1'
		},
		solarized_dark: {
			statusHue:'#073642',
			background:'#002b36',
			overTextMarkerFg:'#586e75',
			warnedStatusFg:'#fdf6e3', warnedStatusBg:'#dc322f',
			invertFg:'#002b36', invertBg:'#839496',
			blurFg:'#002b36', blurBg:'#eee8d5',

			rowBgOdd:'#002b36',
			editCursorFg:'#839496',
			statusFg:'#586e75',
			lineNumberFg:'#586e75', lineNumberBg:'#eee8d5',
			rowFg:'#839496', rowBg:'#002b36',
			highlightFg:'#002b36', highlightBg:'#586e75',
			lineInputFg:'#002b36', lineInputBg:'rgba(255,255,255,0.5)',
			consoleFg:'#002b36', consoleBg:'rgba(159,205,74,0.9)',
			boundFg:'#002b36', boundBg:'#586e75'
		},
		blight: {
			statusHue:'#4f6881',
			background:'white',
			overTextMarkerFg:'#888',
			warnedStatusFg:'white', warnedStatusBg:'#f00',
			invertFg:'white', invertBg:'#333',
			blurFg:'white', blurBg:'gray',

			rowBgOdd:'#f3f6fa',
			editCursorFg:'black',
			statusFg:'white',
			lineNumberFg:'#888', lineNumberBg:'#fff',
			rowFg:'black', rowBg:'white',
			highlightFg:'highlighttext', highlightBg:'highlight',
			lineInputFg:'white', lineInputBg:'rgba(0,0,0,0.5)',
			consoleFg:'white', consoleBg:'rgba(0,0,0,0.8)',
			boundFg:'white', boundBg:'#8495a7'
		},
		charcoal: {
			statusHue:'#c2bfa5',
			background:'#333',
			overTextMarkerFg:'#add8e6',
			warnedStatusFg:'white', warnedStatusBg:'#f00',
			invertFg:'#333', invertBg:'#f0e68c',
			blurFg:'white', blurBg:'gray',

			rowBgOdd:'#444',
			editCursorFg:'white',
			statusFg:'black',
			lineNumberFg:'#ff0', lineNumberBg:'#333',
			rowFg:'#fff', rowBg:'#333',
			highlightFg:'highlight', highlightBg:'highlighttext',
			lineInputFg:'black', lineInputBg:'rgba(255,255,255,0.5)',
			consoleFg:'black', consoleBg:'rgba(159,205,74,0.9)',
			boundFg:'black', boundBg:'#f5b338'
		},
		// contributed by @biell
		matrix: {
			statusHue:'#2ba',
			background:'#050505',
			overTextMarkerFg:'#2ba',
			warnedStatusFg:'#fff', warnedStatusBg:'#e30',
			invertFg:'#000', invertBg:'#1e4',
			blurFg:'#0f0', blurBg:'#050505',

			rowBgOdd:'#0a0a0a',
			editCursorFg:'#2ba',
			statusFg:'#000',
			lineNumberFg:'#2ba', lineNumberBg:'#080808',
			rowFg:'#0f0', rowBg:'#050505',
			highlightFg:'highlight', highlightBg:'highlighttext',
			lineInputFg:'#0f0', lineInputBg:'rgba(0,0,0,0.9)',
			consoleFg:'#0f0', consoleBg:'#111',
			boundFg:'#0f0', boundBg:'#233'
		}
	};

	/** @returns {string[]} */
	function getCSSRules () {
		/** @type {Record<string, string[]>} */
		var pieces = {};
		for (var i in colors) {
			var color = colors[i];
			if (!(color instanceof Array)) continue;
			if (i == 'rowBgOdd' && !useStripe) continue;
			var selector = color[0];
			var rule = color[1];
			(pieces[selector] || (pieces[selector] = []))
				.push((/Fg$/.test(i) ? 'color' : 'background-color') + ':' + rule);
		}

		/** @type {string[]} */
		var buffer = [];
		for (var i in pieces) {
			buffer.push(i + '{', pieces[i].join(';') + ';', '}');
		}

		return buffer;
	}
	/**
	 * @param {(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D | null) => void} callback
	 * @returns {string}
	 */
	function getImageFromCanvas (callback) {
		var result = '';
		var canvas = /** @type {HTMLElement} */ (container).appendChild(document.createElement('canvas'));
		try {
			callback(canvas, canvas.getContext('2d'));
			result = canvas.toDataURL('image/png');
		}
		finally {
			/** @type {ParentNode} */ (canvas.parentNode).removeChild(canvas);
		}
		return result;
	}
	/**
	 * @param {string} forecolor
	 * @param {string} backcolor
	 * @returns {string}
	 */
	function getOverTextMarker (forecolor, backcolor) {
		return getImageFromCanvas(function (canvas, ctxOrNull) {
			var ctx = /** @type {CanvasRenderingContext2D} */ (ctxOrNull);
			ctx.font = fontStyle;
			canvas.width = ctx.measureText('~').width;
			canvas.height = window.screen.height;

			ctx.font = fontStyle;
			ctx.fillStyle = backcolor;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = forecolor;
			ctx.textBaseline = 'top';
			ctx.textAlign = 'left';

			for (var i = 0, goal = canvas.height; i < goal; i += lineHeight) {
				ctx.fillText('~', 0, i);
			}
		});
	}
	/** @returns {Record<string, string | number>} */
	function getMirror () {
		/** @type {Record<string, string | number>} */
		var result = {};
		for (var i in colors) {
			var color = colors[i];
			result[i] = color instanceof Array ? color[1] : color;
		}
		return result;
	}
	function getStyleElement () {
		return $('wasavi_theme_styles');
	}
	/**
	 * @param {string | number} key
	 * @returns {string}
	 */
	function getStatuslineBackground (key) {
		switch (typeof key) {
		case 'number':
			var n = new Date;
			key = key - 0 || 0;
			key = key < 0 ?
				Math.floor((n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds()) / 240) :
				key % 360;
			return 'linear-gradient(top,hsl(' + key + ',100%,33%) 0%,#000 100%);';
		case 'string':
			return key;
		}
		return '#888';
	}
	/**
	 * @param {Record<string, string>} colorSet
	 * @returns {boolean}
	 */
	function doSelect (colorSet) {
		/** @type {Record<string, string | [string, string]>} */
		var newColors = {};
		for (var i in colors) {
			if (!(i in colorSet)) return false;
			var color = colors[i];
			newColors[i] = color instanceof Array ?
				[color[0], colorSet[i]] : colorSet[i];
		}
		colors = newColors;
		return true;
	}
	/**
	 * @param {string} colorSetName
	 * @returns {boolean | undefined}
	 */
	function select (colorSetName) {
		if (!colorSetName || colorSetName == '' || !(colorSetName in colorSets)) {
			colorSetName = 'blight';
		}
		if (colorSetName == currentColorSetName) {
			return;
		}
		currentColorSetName = colorSetName;
		return doSelect(colorSets[colorSetName]);
	}
	/** @this {WasaviTheme} */
	function update () {
		if (!container || !colors || colors.background == '') return;

		var styles = getCSSRules();

		var otm = getOverTextMarker(/** @type {string} */ (colors.overTextMarkerFg), /** @type {string} */ (colors.background));
		styles.push(
			'#wasavi_editor{',
			'background:' + colors.background + ' url(' + otm + ') left top no-repeat;',
			'}');

		var statuslineBackground = getStatuslineBackground(/** @type {string | number} */ (colors.statusHue));
		styles.push(
			'#wasavi_footer_status_container,',
			'#wasavi_footer_input_container{',
			'background:' + statuslineBackground + ';',
			'}');

		var node = /** @type {HTMLElement} */ (getStyleElement());
		emptyNodeContents(node);
		node.appendChild(document.createTextNode(styles.join('\n')));

		this.colors = /** @type {Record<string, string>} */ (getMirror());
	}
	function dispose () {
	}

	/** @type {WasaviTheme} */ (/** @type {unknown} */ (this)).colors = /** @type {Record<string, string>} */ (getMirror());

	publish(this,
		select, update, dispose,
		{
			container:[function () {}, /** @param {HTMLElement | null} v */ function (v) {container = v}],
			fontStyle:[function () {}, /** @param {string} v */ function (v) {fontStyle = v}],
			lineHeight:[function () {}, /** @param {number} v */ function (v) {lineHeight = v}],
			useStripe:[function () {}, /** @param {boolean} v */ function (v) {useStripe = v}],
			colorSets:function () {return Object.keys(colorSets)}
		}
	);
}));

// methods are attached via publish(this, ...), which tsc cannot model;
// assert the constructor shape declared in wasavi-namespace.d.ts.
Wasavi.Bell = /** @type {new (app: WasaviApp) => WasaviBell} */ (/** @type {unknown} */ (
	/** @param {WasaviApp} app */
	function (app) {
	/**
	 * @param {string} [key]
	 * @param {boolean} [forcePlay]
	 */
	function play (key, forcePlay) {
		if (!forcePlay && app.config.vars.visualbell) {
			let cover = /** @type {HTMLElement} */ ($('wasavi_cover'));
			cover.classList.add('visualbell');
			cover.addEventListener('animationend', /** @param {AnimationEvent} e */ function animationend (e) {
				var target = /** @type {HTMLElement} */ (e.target);
				target.removeEventListener(e.type, /** @type {EventListener} */ (animationend));
				target.classList.remove('visualbell');
			});
		}
		else {
			app.extensionChannel.postMessage({
				type: 'play-sound',
				key: key || 'beep',
				volume: app.config.vars.bellvolume
			});
		}
	}

	publish(this, play);
}));

// methods are attached via publish(this, ...), which tsc cannot model;
// assert the constructor shape declared in wasavi-namespace.d.ts.
Wasavi.CursorUI = /** @type {new (app: WasaviApp, comCursor: unknown, comCursorLine: unknown, comCursorColumn: unknown, comFocusHolder: unknown, input: unknown) => WasaviCursorUI} */ (/** @type {unknown} */ (
	/**
	 * @param {WasaviApp} app
	 * @param {HTMLElement} comCursor
	 * @param {HTMLElement} comCursorLine
	 * @param {HTMLElement} comCursorColumn
	 * @param {HTMLElement} comFocusHolder
	 * @param {HTMLElement} input
	 */
	function (app, comCursor, comCursorLine, comCursorColumn, comFocusHolder, input) {
	var buffer = app.buffer;
	var locked = false;
	var focused = false;
	var visible = false;
	/** @type {CursorBase | null} */
	var wrapper = null;
	/** @type {Record<string, CursorBase>} */
	var wrappers = {};

	class CursorBase {
		/** @type {string | undefined} */
		type;

		reset () {}
		hide () {}
		show () {}
		lostFocus () {}
		windup () {}
		/** @param {string} [data] */
		compositionUpdate (data) {}
		/** @param {string} [data] */
		compositionComplete (data) {}
		dispose () {}
	}

	class CommandCursor extends CursorBase {
		/** @type {ReturnType<typeof setInterval> | null | undefined} */
		#cursorBlinkTimer;

		/** @returns {HTMLElement | null} */
		#getCursorSpan () {
			var spans = buffer.getSpans(Wasavi.CURSOR_SPAN_CLASS);
			return spans.length ? /** @type {HTMLElement} */ (spans[0]) : null;
		}
		#startBlink () {
			this.#stopBlink();
			if (app.config.vars.cursorblink) {
				this.#cursorBlinkTimer = setInterval(() => {
					if (!comCursor) {
						this.#stopBlink();
						return;
					}

					var span = this.#getCursorSpan();
					if (span) {
						if (span.getAttribute('data-blink-active') == '1') {
							span.style.color = span.style.backgroundColor = '';
							span.setAttribute('data-blink-active', '0');
						}
						else {
							span.style.color = app.theme.colors.invertFg;
							span.style.backgroundColor = app.theme.colors.invertBg;
							span.setAttribute('data-blink-active', '1');
						}
					}
					else {
						var s = /** @type {WindowProxy} */ (document.defaultView).getComputedStyle(comCursor, '');
						comCursor.style.visibility = s.visibility == 'visible' ? 'hidden' : 'visible';
					}
				}, 500);
			}
		}
		#stopBlink () {
			this.#cursorBlinkTimer && clearInterval(this.#cursorBlinkTimer);
			this.#cursorBlinkTimer = null;
		}
		#locate () {
			var ch = buffer.charAt(buffer.selectionStart);
			var cursorLine = 0;
			var cursorColumn = 0;
			if (ch != '' && /[^\u0000-\u001f\u007f]/.test(ch)) {
				comCursor.style.display = 'none';

				var span = this.#getCursorSpan();
				if (!span) {
					var clusters = /** @type {{ clusterAt(i: number): { length: number }, getClusterIndexFromUTF16Index(i: number): number }} */ (buffer.getGraphemeClusters());
					span = buffer.emphasis(
						undefined,
						clusters.clusterAt(clusters.getClusterIndexFromUTF16Index(buffer.selectionStartCol)).length,
						Wasavi.CURSOR_SPAN_CLASS)[0];
				}

				span.style.color = app.theme.colors.invertFg;
				span.style.backgroundColor = app.theme.colors.invertBg;
				span.setAttribute('data-blink-active', '1');

				var coord = span.getBoundingClientRect();
				cursorLine = coord.bottom;
				cursorColumn = coord.left;
			}
			else {
				buffer.unEmphasis(Wasavi.CURSOR_SPAN_CLASS);
				comCursor.style.display = 'block';
				comCursor.style.visibility = 'visible';
				comCursor.childNodes[0].textContent = ' ';

				var coord2 = getCommandCursorCoord();
				comCursor.style.left = (coord2.left - buffer.elm.scrollLeft) + 'px';
				comCursor.style.top = (coord2.top - buffer.elm.scrollTop) + 'px';
				comCursor.style.height = app.lineHeight + 'px';
				comCursor.style.color = app.theme.colors.invertFg;
				comCursor.style.backgroundColor = app.theme.colors.invertBg;

				cursorLine = coord2.bottom - buffer.elm.scrollTop;
				cursorColumn = coord2.left - buffer.elm.scrollLeft;
			}

			if (app.config.vars.cursorline && app.inputMode == 'command') {
				comCursorLine.style.display = '';
				comCursorLine.style.top = cursorLine + 'px';
			}
			else {
				comCursorLine.style.display = 'none';
			}

			if (app.config.vars.cursorcolumn && app.inputMode == 'command') {
				comCursorColumn.style.display = '';
				comCursorColumn.style.left = cursorColumn + 'px';
			}
			else {
				comCursorColumn.style.display = 'none';
			}

			buffer.adjustBackgroundImage();
			buffer.adjustLineNumber(app.config.vars.relativenumber);
			buffer.adjustWrapGuide(/** @type {number} */ (app.config.vars.textwidth), app.charWidth);
			buffer.updateActiveRow();
		}

		reset () {
			this.#cursorBlinkTimer = undefined;
		}
		hide () {
			this.#stopBlink();
			buffer.unEmphasis(Wasavi.CURSOR_SPAN_CLASS);
			comCursor.style.display =
			comCursorLine.style.display =
			comCursorColumn.style.display = 'none';
		}
		show () {
			if (app.backlog.visible) return;

			this.#locate();
			comFocusHolder.focus();
			this.#startBlink();
		}
		lostFocus () {
			if (app.backlog.visible) return;

			this.#locate();
			this.#stopBlink();
			var span = this.#getCursorSpan();
			if (span) {
				span.style.color = app.theme.colors.blurFg;
				span.style.backgroundColor = app.theme.colors.blurBg;
			}
			else {
				comCursor.style.color = app.theme.colors.blurFg;
				comCursor.style.backgroundColor = app.theme.colors.blurBg;
			}
		}
		dispose () {
			this.#stopBlink();
		}
		windup () {
			this.hide();
		}
	}

	class InputCursor extends CursorBase {
		hide () {
			/** @type {Selection} */ (window.getSelection()).removeAllRanges();
			var n = buffer.selectionStart;
			var node = /** @type {HTMLElement} */ (buffer.rowNodes(n));
			node.removeAttribute('contenteditable');
			node.blur();
		}
		show () {
			buffer.adjustBackgroundImage(app.lineHeight);
			buffer.adjustLineNumber();
			buffer.updateActiveRow();

			var n = buffer.selectionStart;
			var node = /** @type {HTMLElement} */ (buffer.rowNodes(n));
			node.contentEditable = 'true';
			node.focus();
			app.keyManager.editable.setSelectionRange(node, n.col);
		}
	}

	class LineInputCursor extends CursorBase {
		show () {
			input.focus();
		}
	}

	/** @returns {{ left: number, top: number, right: number, bottom: number }} */
	function getCommandCursorCoord () {
		var r = /** @type {{ left: number, top: number, right: number, bottom: number }} */ (buffer.charRectAt(buffer.selectionStart));
		var result = {
			left:r.left + buffer.scrollLeft,
			top:r.top + buffer.scrollTop,
			right:(r.right == r.left ? r.left + app.charWidth : r.right) + buffer.scrollLeft,
			bottom:(r.bottom == r.top ? r.top + app.lineHeight : r.bottom) + buffer.scrollTop
		};
		return result;
	}
	/** @param {boolean} [smooth] */
	function ensureVisible (smooth) {
		if (!buffer.selected) {
			var low = app.low;
			var requestedState = app.requestedState;
			var needFix1 = !low.isEditing();
			var needFix2 = !requestedState.inputMode || !low.isEditing(requestedState.inputMode.mode);
			if (needFix1 && needFix2) {
				var n = buffer.selectionStart;
				if (n.col > 0) {
					var clusters = /** @type {{ rawIndexAt(i: number): number, length: number }} */ (buffer.getGraphemeClusters(n));
					if (n.col >= clusters.rawIndexAt(clusters.length)) {
						n.col = clusters.rawIndexAt(clusters.length - 1);
						buffer.setSelectionRange(n);
					}
				}
			}
		}

		buffer.adjustLineNumberClass(
			/** @type {boolean} */ (app.config.vars.number), /** @type {boolean} */ (app.config.vars.relativenumber));

		var caret = getCommandCursorCoord();
		var elm = buffer.elm;
		var viewBottom = elm.scrollTop + elm.clientHeight;

		if (caret.top < elm.scrollTop && caret.bottom <= viewBottom) {
			if (smooth) {
				app.scroller.run(caret.top);
			}
			else {
				buffer.scrollTop = caret.top;
			}
		}
		else if (caret.bottom > viewBottom && caret.top >= elm.scrollTop) {
			if (smooth) {
				app.scroller.run(caret.bottom - elm.clientHeight);
			}
			else {
				buffer.scrollTop = caret.bottom - elm.clientHeight;
			}
		}
	}
	/**
	 * @param {string} mode
	 * @returns {{ type: string, ctor: new () => CursorBase }}
	 */
	function getTypeInfo (mode) {
		/** @type {string} */
		var type;
		/** @type {new () => CursorBase} */
		var ctor;

		switch (mode) {
		default:
			type = 'command';
			ctor = CommandCursor;
			break;

		case 'edit':
		case 'overwrite':
			type = 'input';
			ctor = InputCursor;
			break;

		case 'line_input':
			type = 'line_input';
			ctor = LineInputCursor;
			break;

		case 'ex_s_prompt':
			type = 'null';
			ctor = CursorBase;
			break;
		}

		return {
			type: type,
			ctor: ctor
		};
	}

	/** @param {{ visible?: boolean, focused?: boolean, type?: string }} [opts] */
	function update (opts) {
		if (locked) return;

		/** @type {{ type: string, ctor: new () => CursorBase } | undefined} */
		var typeInfo;

		if (opts) {
			if ('visible' in opts) {
				visible = /** @type {boolean} */ (opts.visible);
			}
			if ('focused' in opts) {
				focused = /** @type {boolean} */ (opts.focused);
			}
			if ('type' in opts) {
				typeInfo = getTypeInfo(/** @type {string} */ (opts.type));
				if (!wrapper || typeInfo.type != wrapper.type) {
					wrapper && wrapper.hide();
				}
				else {
					typeInfo = undefined;
				}
			}
		}

		if (typeInfo) {
			wrapper = wrappers[typeInfo.type]
				|| (wrappers[typeInfo.type] = new typeInfo.ctor());
			wrapper.type = typeInfo.type
			wrapper.reset();
		}

		var w = /** @type {CursorBase} */ (wrapper);
		if (!visible) {
			w.hide();
		}
		else {
			if (focused) {
				w.show();
			}
			else {
				w.lostFocus();
			}
		}
	}
	/** @param {CompositionEvent} e */
	function handleCompositionStart (e) {
		(/** @type {CursorBase} */ (wrapper)).compositionUpdate(e.data);
	}
	/** @param {CompositionEvent} e */
	function handleCompositionUpdate (e) {
		(/** @type {CursorBase} */ (wrapper)).compositionUpdate(e.data);
	}
	/** @param {CompositionEvent} e */
	function handleCompositionEnd (e) {
		setTimeout(function () {
			buffer.ensureNewline(buffer.selectionStart);
		}, 1);
		return (/** @type {CursorBase} */ (wrapper)).compositionComplete(e.data);
	}
	/** @param {boolean} install */
	function setupEventHandlers (install) {
		/** @type {'addListener' | 'removeListener'} */
		var method = install ? 'addListener' : 'removeListener';
		app.keyManager[method]('compositionstart', handleCompositionStart);
		app.keyManager[method]('compositionupdate', handleCompositionUpdate);
		app.keyManager[method]('compositionend', handleCompositionEnd);
	}
	function windup () {
		(/** @type {CursorBase} */ (wrapper)).windup();
	}
	function dispose () {
		wrapper && wrapper.dispose();
	}

	publish(this,
		ensureVisible, update, setupEventHandlers, windup, dispose,
		{
			type:function () {return wrapper ? wrapper.type : null},
			focused:function () {return focused},
			visible:function () {return visible},
			commandCursor:function () {return comCursor},
			locked:[function () {return locked}, /** @param {boolean} v */ function (v) {locked = v}]
		}
	);
}));

// methods are attached via publish(this, ...), which tsc cannot model;
// assert the constructor shape declared in wasavi-namespace.d.ts.
Wasavi.Scroller = /** @type {new (app: WasaviApp, cursor: WasaviCursorUI, modeLine: unknown) => WasaviScroller} */ (/** @type {unknown} */ (
	/**
	 * @param {WasaviApp} app
	 * @param {WasaviCursorUI} cursor
	 * @param {HTMLElement} modeLine
	 */
	function (app, cursor, modeLine) {
	let buffer = app.buffer;
	let running = false;
	let consumeMsecs = 250;
	let timerPrecision = 1;
	let lastRan = 0;
	/** @type {number} */
	let distance;
	/** @type {number} */
	let scrollTopStart;
	/** @type {number} */
	let scrollTopDest;
	/** @type {ReturnType<typeof setInterval> | undefined} */
	let scrollTimer;

	/**
	 * @param {number} dest
	 * @returns {Promise<boolean>}
	 */
	function run (dest) {
		return new Promise(resolve => {
			if (!app.targetElement || !cursor || !modeLine) {
				resolve(true);
				return;
			}

			scrollTopStart = buffer.scrollTop;
			scrollTopDest = Math.max(0, dest);

			if (scrollTopStart == scrollTopDest || !app.config.vars.smooth || cursor.locked) {
				buffer.scrollTop = scrollTopDest;
				resolve(true);
				return;
			}

			distance = scrollTopDest - scrollTopStart;
			running = true;
			lastRan = Date.now();
			scrollTimer = setInterval(() => {
				let now = Date.now();
				let y = scrollTopStart + ((now - lastRan) / consumeMsecs) * distance;

				if (distance > 0 && y >= scrollTopDest
				||  distance < 0 && y <= scrollTopDest) {
					clearInterval(scrollTimer);
					scrollTimer = undefined;
					buffer.scrollTop = scrollTopDest;
					running = false;
					resolve(true);
				}
				else {
					buffer.scrollTop = Math.floor(y);
				}
			}, timerPrecision);
		});
	}

	function dispose () {
	}

	publish(this,
		run, dispose,
		{
			running:function () {return running},
			consumeMsecs:[
				function () {return consumeMsecs},
				/** @param {number} v */ function (v) {consumeMsecs = v}
			],
			timerPrecision:[
				function () {return timerPrecision},
				/** @param {number} v */ function (v) {timerPrecision = v}
			]
		}
	);
}));

/**
 * @typedef {object} BacklogLine
 * @property {string} text
 * @property {boolean} [emphasis]
 */
// methods are attached via publish(this, ...), which tsc cannot model;
// assert the constructor shape declared in wasavi-namespace.d.ts.
Wasavi.Backlog = /** @type {new (app: WasaviApp, container: unknown, con: unknown) => WasaviBacklog} */ (/** @type {unknown} */ (
	/**
	 * @param {WasaviApp} app
	 * @param {HTMLElement} container
	 * @param {HTMLElement} con
	 */
	function (app, container, con) {
	/** @type {BacklogLine[]} */
	var buffer = [];
	/** @type {number} */
	var charWidth;
	/** @type {number} */
	var charHeight;

	/**
	 * @param {BacklogLine} line
	 * @returns {HTMLDivElement}
	 */
	function append (line) {
		let el = con.appendChild(document.createElement('div'));
		el.className = 'backlog-row';

		if (line.emphasis) {
			let span = el.appendChild(document.createElement('span'));
			span.style.color = app.theme.colors.warnedStatusFg;
			span.style.backgroundColor = app.theme.colors.warnedStatusBg;
			span.textContent = line.text;
		}
		else {
			let components = line.text.split(/(\ue000(?:<[^>]+>|#\d{1,2}))/);
			components.forEach(component => {
				if (component.charAt(0) == '\ue000') {
					let span = el.appendChild(document.createElement('span'));
					span.className = 'special-key';
					span.style.backgroundColor = app.theme.colors.consoleFg;
					span.style.color = app.theme.colors.consoleBg;

					if (component.charAt(1) == '<') {
						span.textContent = component.substring(2, component.length - 1);
					}
					else {
						span.textContent = 'F' + component.substring(2);
					}
				}
				else {
					el.appendChild(document.createTextNode(component));
				}
			});
		}

		return el;
	}
	function ensureSetCharSize () {
		if (charWidth && charHeight) return;
		var span = con.appendChild(document.createElement('span'));
		try {
			span.textContent = '0';
			charWidth = span.offsetWidth;
			charHeight = span.offsetHeight;
		}
		finally {
			removeChild(span);
		}
	}

	/** @param {unknown} arg */
	function push (arg) {
		if (isArray(arg)) {
			arg.forEach(push);
		}
		else if (isObject(arg)) {
			if (!('text' in arg)) arg.text = '';
			buffer.push(/** @type {BacklogLine} */ (arg));
		}
		else {
			buffer.push({text:'' + arg});
		}
	}
	/** @param {unknown} arg */
	function pushEmphasis (arg) {
		if (isArray(arg)) {
			arg.forEach(push);
		}
		else if (isObject(arg)) {
			if (!('text' in arg)) arg.text = '';
			arg.emphasis = true;
			buffer.push(/** @type {BacklogLine} */ (arg));
		}
		else {
			buffer.push({text:'' + arg, emphasis:true});
		}
	}
	function show () {
		container.style.visibility = 'visible';
	}
	function hide () {
		container.style.visibility = 'hidden';
	}
	function clear () {
		buffer.length = 0;
	}
	/** @param {boolean} [byLine] */
	function open (byLine) {
		var totalHeight = 0;
		var goalHeight = getRows() * charHeight;

		if (!getVisible()) {
			show();
			emptyNodeContents(con);
			var el = con.appendChild(document.createElement('div'));
			el.style.height = goalHeight + 'px';
		}

		while (buffer.length) {
			var line = /** @type {BacklogLine} */ (buffer.shift());
			var el = append(line);

			if (totalHeight > 0
			&& (totalHeight + el.offsetHeight > goalHeight || byLine)) {
				buffer.unshift(line);
				removeChild(el);
				break;
			}
			else {
				var lastMessage = app.lastMessage;
				app.lastMessage =
					lastMessage +
					(lastMessage == '' || lastMessage.substr(-1) == '\n' ? '' : '\n') +
					toNativeControl(line.text);
				con.scrollTop = con.scrollHeight - con.clientHeight;
				totalHeight += el.offsetHeight;
			}
		}

		app.low.showMessageCore(
			buffer.length ? _('More...') :
							_('Press any key to continue, or enter more ex command:'),
			false, true, true);
	}
	function dispose () {
	}

	/** @returns {BacklogLine[]} */
	function getBuffer () {
		return buffer;
	}
	/** @returns {boolean} */
	function getQueued () {
		return buffer.length > 0;
	}
	/** @returns {number} */
	function getRows () {
		ensureSetCharSize();
		return Math.floor(con.offsetHeight / charHeight);
	}
	/** @returns {number} */
	function getCols () {
		ensureSetCharSize();
		return Math.floor(con.offsetWidth / charWidth);
	}
	/** @returns {boolean} */
	function getVisible () {
		return /** @type {WindowProxy} */ (document.defaultView).getComputedStyle(container, '').visibility != 'hidden';
	}
	/** @returns {string} */
	function getText () {
		return Array.prototype.map.call(
			con.getElementsByClassName('backlog-row'),
			/** @param {Element} o */ function (o) {return o.textContent}
		)
		.join('\n');
	}

	publish(this,
		push, pushEmphasis, show, hide, clear, open, dispose,
		{
			buffer:getBuffer,
			queued:getQueued,
			rows:getRows,
			cols:getCols,
			visible:getVisible,
			text:getText
		}
	);
}));

/**
 * @typedef {string | ((container: HTMLElement) => void)} NotifierMessage
 */
// methods are attached via publish(this, ...), which tsc cannot model;
// assert the constructor shape declared in wasavi-namespace.d.ts.
Wasavi.Notifier = /** @type {new (app: WasaviApp, container: unknown) => WasaviNotifier} */ (/** @type {unknown} */ (
	/**
	 * @param {WasaviApp} app
	 * @param {HTMLElement} container
	 */
	function (app, container) {
	const delayIntervalMsecs = 500;
	const hideIntervalMsecs = 2000;
	/** @type {ReturnType<typeof setTimeout> | null} */
	var showTimer;
	/** @type {ReturnType<typeof setTimeout> | null} */
	var hideTimer;
	/** @type {NotifierMessage | null} */
	var registeredMessage;

	/**
	 * @param {NotifierMessage} message
	 * @param {number} [intervalMsecs]
	 * @param {number} [delayMsecs]
	 */
	function register (message, intervalMsecs, delayMsecs) {
		registeredMessage = message;
		if (showTimer) return;
		showTimer = setTimeout(function () {
			showTimer = null;
			show(/** @type {NotifierMessage} */ (registeredMessage), intervalMsecs);
			registeredMessage = null;
		}, delayMsecs || delayIntervalMsecs);
	}
	/**
	 * @param {NotifierMessage} message
	 * @param {number} [intervalMsecs]
	 */
	function show (message, intervalMsecs) {
		hideTimer && clearTimeout(hideTimer);
		if (typeof message == 'function') {
			message(container);
		}
		else {
			container.textContent = message;
		}
		container.style.visibility = 'visible';
		hideTimer = setTimeout(function () {
			hideTimer = null;
			hide();
		}, intervalMsecs || hideIntervalMsecs);
	}
	function hide () {
		container.style.visibility = 'hidden';
		showTimer && clearTimeout(showTimer);
		hideTimer && clearTimeout(hideTimer);
		showTimer = hideTimer = null;
	}
	function dispose () {
	}

	publish(this, register, show, hide, dispose);
}));

})(typeof globalThis == 'object' ? globalThis : window);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
