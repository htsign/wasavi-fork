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
 * The `undo`/`redo` paths branch on `Object.hasOwn(this, 'data2')` and
 * `Object.hasOwn(this, 'isLineOrient')` to tell the item subclasses apart.
 * To keep those checks accurate, `data2` is declared as a class field only on
 * EditLogItemOverwrite and `isLineOrient` only on EditLogItemDelete (never on
 * the base or the other subclasses), so each own-property exists exactly on the
 * subclass the original code assigned it on. The shared methods, which don't
 * know the concrete subclass, read them through this view with a cast.
 *
 * @typedef {EditLogItemBase & { data2?: string, isLineOrient?: boolean }} EditLogItemDynamic
 */

class EditLogItemBase {
	type = 'Base';
	/** @type {WasaviPosition | undefined} */
	position = undefined;
	/** @type {string | undefined} */
	data = undefined;
	/** @type {'insertChars' | 'overwriteChars'} */
	inputMethod = 'insertChars';
	/** @type {string | undefined} */
	tag = undefined;

	/**
	 * @param {WasaviPosition} [p]
	 * @param {string} [d]
	 */
	_init(p, d) {
		if (p != undefined) {
			this.position = p.clone();
		}

		if (d != undefined) {
			// aaabbb^H^H^Hccc -> aaaccc
			var re;
			while ((re = /[^\u0008]\u0008/.exec(d))) {
				d = d.substring(0, re.index)
					+ d.substring(re.index + re[0].length);
			}

			// convert control chars
			d = d.replace(
				/[\u0000-\u0008\u000b-\u001f\u007f]/g,
				function (a) {
					return toVisibleControl(a.charCodeAt(0));
				}
			);

			this.data = d;
		}
	}
	/**
	 * @param {number} depth
	 * @returns {string}
	 */
	_dump(depth) {
		return multiply(' ', depth) +
			'+ ' + this.type + '\n' +
			multiply(' ', depth + 2) +
			'position:' + (this.position ? this.position.toString() : '(N/A)') +
			', data:' + (this.data != undefined ? ('"' + toVisibleString(this.data) + '"') : '(N/A)');
	}
	/**
	 * @param {WasaviEditor} t
	 * @param {WasaviPosition} p
	 * @returns {boolean}
	 */
	_ensureValidRow(t, p) {
		return p.row >= 0 && p.row < t.rowLength;
	}
	/**
	 * @param {WasaviEditor} t
	 * @param {WasaviPosition} p
	 * @returns {boolean}
	 */
	_ensureValidPosition(t, p) {
		return p.row >= 0 && p.row < t.rowLength
			&& p.col >= 0 && p.col <= t.rows(p).length;
	}
	/**
	 * @this {EditLogItemDynamic}
	 * @param {WasaviEditor} t
	 * @param {WasaviPosition} p
	 * @returns {boolean}
	 */
	_ensureValidPositionForAppend(t, p) {
		if (this.isLineOrient && p.row == t.rowLength) {
			return true;
		}
		return this._ensureValidPosition(t, p);
	}
	/**
	 * @param {WasaviPosition} [p]
	 * @param {string} [d]
	 */
	init(p, d) {
		this._init(p, d);
	}
	/**
	 * @param {WasaviApp} [app]
	 * @param {WasaviEditor} [t]
	 * @param {boolean} [isClusterMember]
	 * @returns {number | void}
	 */
	undo(app, t, isClusterMember) {
	}
	/**
	 * @param {WasaviApp} [app]
	 * @param {WasaviEditor} [t]
	 * @param {boolean} [isClusterMember]
	 * @returns {number | void}
	 */
	redo(app, t, isClusterMember) {
	}
	/**
	 * @param {WasaviApp} [app]
	 */
	restorePosition(app) {
	}
	/**
	 * @param {number} depth
	 * @returns {string}
	 */
	dump(depth) {
		return this._dump(depth);
	}
	/** @returns {string} */
	toString() {
		return '[object EditLogItem' + this.type + ']';
	}
}

/*
 * insert: point, data
 *
 *     edit, and redo operation:
 *     abcdefghijklmn -> abcABCdefghijklmn
 *        ^                    ^
 *        ABC
 *
 *     undo operation:
 *     abcABCdefghijklmn -> abcdefghijklmn
 *        ^                    ^
 */

class EditLogItemInsert extends EditLogItemBase {
	type = 'Insert';
	/** @type {WasaviPosition | undefined} */
	position2 = undefined;
	/** @type {boolean | undefined} */
	isLastLine = undefined;
	/** @type {Record<string, WasaviPositionLike> | undefined} */
	marks = undefined;

	/**
	 * @param {WasaviPosition} [p]
	 * @param {string} [d]
	 */
	init(p, d) {
		this._init(p, d);
	}
	/**
	 * @param {WasaviApp} app
	 * @param {WasaviEditor} t
	 * @param {boolean} [isClusterMember]
	 * @returns {number}
	 */
	undo(app, t, isClusterMember) {
		if (!this._ensureValidPosition(t, /** @type {WasaviPosition} */ (this.position))) {
			app.low.error(this.toString() + '#undo: bad position!');
			return 0;
		}

		var ss = (/** @type {WasaviPosition} */ (this.position)).clone();
		var se = this.position2 ? this.position2.clone() : t.offsetBy(ss, (/** @type {string} */ (this.data)).length);
		var data2 = Object.hasOwn(this, 'data2') ? (/** @type {EditLogItemDynamic} */ (this)).data2 : false;

		if (Object.hasOwn(this, 'isLineOrient')) {
			t.isLineOrientSelection = /** @type {boolean} */ ((/** @type {EditLogItemDynamic} */ (this)).isLineOrient);
		}
		else {
			t.isLineOrientSelection = false;
		}

		if (t.getSelection(ss, se) != this.data) {
			app.low.error([
				this.toString() + '#undo: bad consistency!',
				' position: ' + this.position,
				'position2: ' + (this.position2 || '(N/A)'),
				'       LO: ' + (Object.hasOwn(this, 'isLineOrient') ? (/** @type {EditLogItemDynamic} */ (this)).isLineOrient : '(N/A)'),
				'       ss: ' + ss,
				'       se: ' + se,
				'selection: "' + toVisibleString(t.getSelection(ss, se)) + '"',
				'this.data: "' + toVisibleString(this.data) + '"'
			].join('\n'));
			return 0;
		}

		app.marks.update(ss, function () {
			t.deleteRange(ss, se);
		});
		data2 !== false && t.setRow(ss, /** @type {string} */ (data2));
		!isClusterMember && this.restorePosition(app);
		t.isLineOrientSelection = false;

		return 1;
	}
	/**
	 * @param {WasaviApp} app
	 * @param {WasaviEditor} t
	 * @param {boolean} [isClusterMember]
	 * @returns {number}
	 */
	redo(app, t, isClusterMember) {
		if (!this._ensureValidPositionForAppend(t, /** @type {WasaviPosition} */ (this.position))) {
			app.low.error([
				this.toString() + '#redo: bad position!',
				'this.position: ' + this.position,
				'  t.rowLength: ' + t.rowLength
			].join('\n'));
			return 0;
		}

		var self = this;
		app.marks.update(/** @type {WasaviPosition} */ (this.position), function () {
			var data = /** @type {string} */ (self.data);

			if (self.isLastLine) {
				data = trimTerm(data);
			}
			if ((/** @type {WasaviPosition} */ (self.position)).row == t.rowLength) {
				t.setSelectionRange(new Wasavi.Position(
					t.rowLength - 1,
					t.rows(t.rowLength - 1).length
				));
				t.divideLine();
			}
			else {
				t.setSelectionRange(self.position);
			}

			var re = data.match(/\n|[^\n]+/g);
			if (!re) return;

			for (var i = 0; i < re.length; i++) {
				re[i] == '\n' ?
					isMultilineTextInput(/** @type {{ nodeName: string }} */ (app.targetElement)) && t.divideLine() :
					t.setSelectionRange(t[self.inputMethod](t.selectionStart, re[i]));
			}
		});
		if (this.marks) {
			for (var i in this.marks) {
				!app.marks.get(i) && app.marks.set(i, this.marks[i]);
			}
		}
		!isClusterMember && this.restorePosition(app);

		return 1;
	}
	/**
	 * @param {WasaviApp} app
	 */
	restorePosition(app) {
		var n = (/** @type {WasaviPosition} */ (this.position)).clone();
		if (n.row < app.buffer.rowLength && n.col >= app.buffer.rows(n).length) {
			n.row++;
			n.col = 0;
		}
		if (n.row >= app.buffer.rowLength) {
			n.row = app.buffer.rowLength - 1;
			app.buffer.setSelectionRange(app.buffer.getLineTopOffset2(n));
		}
		else {
			app.buffer.setSelectionRange(n);
		}
	}
}

/*
 * overwrite: point, data, data2
 *
 *     * example data:
 *
 *       point:[0,3]
 *       data:"ABC"
 *       data2:"abcdefghijklmn"
 *
 *     * edit, and redo operation:
 *
 *       abcdefghijklmn -> abcABCghijklmn
 *          ^                    ^
 *          ABC
 *
 *     * undo operation:
 *
 *       abcABCdefghijklmn -> abcdefghijklmn
 *          ^                    ^
 */

class EditLogItemOverwrite extends EditLogItemBase {
	type = 'Overwrite';
	/** @type {string | undefined} */
	data2 = undefined;

	/**
	 * @param {WasaviPosition} [p]
	 * @param {string} [d]
	 * @param {string} [d2]
	 */
	init(p, d, d2) {
		this._init(p, d);
		this.data2 = d2;
		this.inputMethod = 'overwriteChars';
	}
	/**
	 * @param {WasaviApp} app
	 * @param {WasaviEditor} t
	 * @param {boolean} [isClusterMember]
	 * @returns {number}
	 */
	undo(app, t, isClusterMember) {
		return EditLogItemInsert.prototype.undo.call(this, app, t, isClusterMember);
	}
	/**
	 * @param {WasaviApp} app
	 * @param {WasaviEditor} t
	 * @param {boolean} [isClusterMember]
	 * @returns {number}
	 */
	redo(app, t, isClusterMember) {
		return EditLogItemInsert.prototype.redo.call(this, app, t, isClusterMember);
	}
	/**
	 * @param {WasaviApp} app
	 */
	restorePosition(app) {
		return EditLogItemInsert.prototype.restorePosition.call(this, app);
	}
	/**
	 * @param {number} depth
	 * @returns {string}
	 */
	dump(depth) {
		var indent = '\n' + multiply(' ', depth + 2);
		return this._dump(depth) +
			indent + 'data2:"' + toVisibleString(this.data2) + '"';
	}
}

/*
 * delete: point, data
 *
 *     edit, and redo operation:
 *     abcdefghijklmn -> abcghijklmn
 *        ^                 ^
 *        def
 *
 *     undo operation:
 *     abcghijklmn -> abcdefghijklmn
 *        ^              ^
 *        def
 */

class EditLogItemDelete extends EditLogItemBase {
	type = 'Delete';
	/** @type {WasaviPosition | undefined} */
	position2 = undefined;
	/** @type {boolean | undefined} */
	isLineOrient = undefined;
	/** @type {boolean | undefined} */
	isLastLine = undefined;
	/** @type {Record<string, WasaviPositionLike> | undefined} */
	marks = undefined;

	/**
	 * @param {WasaviPosition} [p]
	 * @param {string} [d]
	 * @param {WasaviPosition} [p2]
	 * @param {unknown} [lo]
	 * @param {unknown} [ll]
	 * @param {Record<string, WasaviPositionLike>} [ms]
	 */
	init(p, d, p2, lo, ll, ms) {
		this._init(p, d);
		this.position2 = (/** @type {WasaviPosition} */ (p2)).clone();
		this.isLineOrient = !!lo;
		this.isLastLine = !!ll;
		this.marks = ms;
	}
	/**
	 * @param {WasaviApp} app
	 * @param {WasaviEditor} t
	 * @param {boolean} [isClusterMember]
	 * @returns {number}
	 */
	undo(app, t, isClusterMember) {
		return EditLogItemInsert.prototype.redo.call(this, app, t, isClusterMember);
	}
	/**
	 * @param {WasaviApp} app
	 * @param {WasaviEditor} t
	 * @param {boolean} [isClusterMember]
	 * @returns {number}
	 */
	redo(app, t, isClusterMember) {
		return EditLogItemInsert.prototype.undo.call(this, app, t, isClusterMember);
	}
	/**
	 * @param {WasaviApp} app
	 */
	restorePosition(app) {
		return EditLogItemInsert.prototype.restorePosition.call(this, app);
	}
	/**
	 * @param {number} depth
	 * @returns {string}
	 */
	dump(depth) {
		var indent = '\n' + multiply(' ', depth + 2);
		return this._dump(depth) +
			indent + 'position2:' + (/** @type {WasaviPosition} */ (this.position2)).toString() +
			indent + 'isLineOrient:' + this.isLineOrient +
			indent + 'isLastLine:' + this.isLastLine;
	}
}

/*
 * shift: point, count
 */

class EditLogItemShift extends EditLogItemBase {
	type = 'Shift';
	/** @type {number | undefined} */
	rowCount = undefined;
	/** @type {number | undefined} */
	shiftCount = undefined;
	/** @type {number | undefined} */
	shiftWidth = undefined;
	/** @type {number | undefined} */
	tabStop = undefined;
	/** @type {boolean | undefined} */
	expandTab = undefined;
	/** @type {readonly unknown[] | undefined} */
	indents = undefined;

	/**
	 * @param {WasaviPosition} [p]
	 * @param {string} [d]
	 * @param {number} [rc]
	 * @param {number} [sc]
	 * @param {number} [sw]
	 * @param {number} [ts]
	 * @param {boolean} [et]
	 */
	init(p, d, rc, sc, sw, ts, et) {
		this._init(p, d);
		this.rowCount = rc;
		this.shiftCount = sc;
		this.shiftWidth = sw;
		this.tabStop = ts;
		this.expandTab = et;
	}
	/**
	 * @param {WasaviApp} app
	 * @param {WasaviEditor} t
	 * @param {boolean} [isClusterMember]
	 * @returns {number}
	 */
	undo(app, t, isClusterMember) {
		if (!this._ensureValidRow(t, /** @type {WasaviPosition} */ (this.position))) {
			app.low.error(this.toString() + '#undo: bad row position!');
			return 0;
		}
		var s = this;
		app.marks.update(/** @type {WasaviPosition} */ (this.position), function () {
			t.shift(
				(/** @type {WasaviPosition} */ (s.position)).row,
				Math.min((/** @type {WasaviPosition} */ (s.position)).row + (/** @type {number} */ (s.rowCount)), t.rowLength) - (/** @type {WasaviPosition} */ (s.position)).row,
				-(/** @type {number} */ (s.shiftCount)), /** @type {number} */ (s.shiftWidth), /** @type {number} */ (s.tabStop), /** @type {boolean} */ (s.expandTab),
				s instanceof EditLogItemShift ? s.indents : null
			);
		});
		!isClusterMember && this.restorePosition(app);
		return 1;
	}
	/**
	 * @param {WasaviApp} app
	 * @param {WasaviEditor} t
	 * @param {boolean} [isClusterMember]
	 * @returns {number}
	 */
	redo(app, t, isClusterMember) {
		if (!this._ensureValidRow(t, /** @type {WasaviPosition} */ (this.position))) {
			app.low.error(this.toString() + '#redo: bad row position!');
			return 0;
		}
		var s = this;
		app.marks.update(/** @type {WasaviPosition} */ (this.position), function () {
			t.shift(
				(/** @type {WasaviPosition} */ (s.position)).row,
				Math.min((/** @type {WasaviPosition} */ (s.position)).row + (/** @type {number} */ (s.rowCount)), t.rowLength) - (/** @type {WasaviPosition} */ (s.position)).row,
				/** @type {number} */ (s.shiftCount), /** @type {number} */ (s.shiftWidth), /** @type {number} */ (s.tabStop), /** @type {boolean} */ (s.expandTab),
				s instanceof EditLogItemUnshift ? s.indents : null
			);
		});
		!isClusterMember && this.restorePosition(app);
		return 1;
	}
	/**
	 * @param {WasaviApp} app
	 */
	restorePosition(app) {
		var n = (/** @type {WasaviPosition} */ (this.position)).clone();
		if (n.row >= app.buffer.rowLength) {
			n.row = app.buffer.rowLength - 1;
		}
		app.buffer.setSelectionRange(app.buffer.getLineTopOffset2(n));
	}
	/**
	 * @param {number} depth
	 * @returns {string}
	 */
	dump(depth) {
		var indent = '\n' + multiply(' ', depth + 2);
		return this._dump(depth) +
			indent + 'rowCount:' + this.rowCount +
			', shiftCount:' + this.shiftCount +
			', shiftWidth:' + this.shiftWidth +
			', tabStop:' + this.tabStop +
			', expandTab:' + this.expandTab +
			indent + 'indents:' + (this.indents ? this.indents.map(function (ind, i) {
				return indent + i + ': ' + toVisibleString(JSON.stringify(ind));
			}).join('') : 'N/A')
	}
}

/*
 * unshift: point, count
 */

class EditLogItemUnshift extends EditLogItemShift {
	type = 'Unshift';

	/**
	 * @param {WasaviPosition} [p]
	 * @param {string} [d]
	 * @param {number} [rc]
	 * @param {number} [sc]
	 * @param {number} [sw]
	 * @param {number} [ts]
	 * @param {boolean} [et]
	 */
	init(p, d, rc, sc, sw, ts, et) {
		EditLogItemShift.prototype.init.call(this, p, d, rc, sc, sw, ts, et);
	}
	/**
	 * @param {WasaviApp} app
	 * @param {WasaviEditor} t
	 * @param {boolean} [isClusterMember]
	 * @returns {number}
	 */
	undo(app, t, isClusterMember) {
		return EditLogItemShift.prototype.redo.call(this, app, t, isClusterMember);
	}
	/**
	 * @param {WasaviApp} app
	 * @param {WasaviEditor} t
	 * @param {boolean} [isClusterMember]
	 * @returns {number}
	 */
	redo(app, t, isClusterMember) {
		return EditLogItemShift.prototype.undo.call(this, app, t, isClusterMember);
	}
	/**
	 * @param {WasaviApp} app
	 */
	restorePosition(app) {
		return EditLogItemShift.prototype.restorePosition.call(this, app);
	}
	/**
	 * @param {number} depth
	 * @returns {string}
	 */
	dump(depth) {
		return EditLogItemShift.prototype.dump.call(this, depth);
	}
}

/*
 * edit log item cluster
 */

class EditLogItemCluster {
	/** @type {EditLogItem[]} */
	items = [];
	nestLevel = 0;
	/** @type {string | undefined} */
	tag = undefined;

	/**
	 * @param {EditLogItem} item
	 */
	push(item) {
		this.items.push(item);
	}
	/**
	 * @param {WasaviApp} app
	 * @returns {number}
	 */
	undo(app) {
		var result = 0;
		for (var i = this.items.length - 1; i >= 0; i--) {
			result += this.items[i].undo(app, app.buffer, true) || 0;
		}
		result && this.items[0].restorePosition(app);
		return result;
	}
	/**
	 * @param {WasaviApp} app
	 * @returns {number}
	 */
	redo(app) {
		var result = 0;
		for (var i = 0; i < this.items.length; i++) {
			result += this.items[i].redo(app, app.buffer, true) || 0;
		}
		result && this.items[0].restorePosition(app);
		return result;
	}
	/**
	 * @param {WasaviApp} [app]
	 */
	restorePosition(app) {
	}
	/**
	 * @param {number} max
	 */
	trim(max) {
		while (this.items.length > max) {
			this.items.shift();
		}
	}
	/**
	 * @param {number} index
	 * @returns {EditLogItem}
	 */
	item(index) {
		return this.items[index];
	}

	/** @returns {string} */
	toString() {
		return '[object EditLogItemCluster<' + (this.tag || 'root') + '>]';
	}
	/**
	 * @param {number} [depth]
	 * @returns {string}
	 */
	dump(depth) {
		depth || (depth = 0);
		var result = [multiply(' ', depth) + '+ ' + this.toString()];
		this.items.forEach(function (o) {
			result.push(o.dump(depth + 1));
		});
		return result.join('\n');
	}
	/** @returns {number} */
	get length() {
		return this.items.length;
	}
	set length(v) {
		this.items.length = v;
	}
	/** @returns {EditLogItem | EditLogItemCluster | null} */
	get representer() {
		if (this.items.length > 1) {
			return this;
		}
		else if (this.items.length == 1) {
			return this.items[0];
		}
		return null;
	}
}

/**
 * Any single edit-log entry: one of the EditLogItem subclasses (the Base
 * itself is only used as a prototype source and is never pushed directly).
 *
 * @typedef {EditLogItemInsert | EditLogItemOverwrite | EditLogItemDelete | EditLogItemShift | EditLogItemUnshift} EditLogItem
 */

/** @type {readonly (new () => EditLogItemBase)[]} */
var pool = [
	EditLogItemBase,
	EditLogItemInsert,
	EditLogItemOverwrite,
	EditLogItemDelete,
	EditLogItemShift,
	EditLogItemUnshift
];

class EditLogger {
	static ITEM_TYPE = {
		NOP: 0,
		INSERT: 1,
		OVERWRITE: 2,
		DELETE: 3,
		SHIFT: 4,
		UNSHIFT: 5
	};

	/**
	 * @param {WasaviApp} app
	 * @param {number} max
	 */
	constructor(app, max) {
		var self = this;
		/** @type {EditLogItemCluster} */
		var logs;
		/** @type {EditLogItemCluster | null} */
		var cluster;
		/** @type {number} */
		var currentPosition;
		/** @type {EditLogItem | EditLogItemCluster | null} */
		var savedAt;

		/** @returns {EditLogger} */
		function clear() {
			logs = new EditLogItemCluster;
			cluster = savedAt = null;
			currentPosition = logs.length - 1;
			return self;
		}
		/**
		 * @param {string} tag
		 * @param {() => void} [func]
		 * @returns {EditLogger}
		 */
		function open(tag, func) {
			if (cluster) {
				cluster.nestLevel++;
			}
			else {
				cluster = new EditLogItemCluster();
				cluster.tag = tag;
			}
			if (func) {
				try {
					func();
				}
				finally {
					close();
				}
			}
			return self;
		}
		/**
		 * @param {number} type
		 * @returns {EditLogItem}
		 */
		function write(type) {
			if (!cluster || !pool[type]) {
				throw new TypeError('EditLogger: invalid undo item type');
			}

			var item = /** @type {EditLogItem} */ (new pool[type]);
			(/** @type {{ init(...args: unknown[]): void }} */ (item)).init.apply(item, toArray(arguments, 1));
			cluster.push(item);
			//console.log('undo item pushed:' + item.dump());

			return item;
		}
		/** @returns {EditLogger} */
		function close() {
			if (!cluster) {
				throw new Error('EditLogger: edit logger doesn\'t open');
			}

			if (--cluster.nestLevel < 0) {
				var tag = cluster.tag;
				var representer = cluster.representer;
				if (representer) {
					representer.tag = tag;
					logs.items.length = currentPosition + 1;
					logs.push(/** @type {EditLogItem} */ (representer));
					logs.trim(max);
					currentPosition = logs.length - 1;
				}
				cluster = null;
				//app.low.log('*** editLogger dump ***\n', logs.dump());
			}

			return self;
		}
		/** @returns {number | false} */
		function undo() {
			return !cluster && currentPosition >= 0 ?
				logs.items[currentPosition--].undo(app, app.buffer) : false;
		}
		/** @returns {number | false} */
		function redo() {
			return !cluster && currentPosition < logs.length - 1 ?
				logs.items[++currentPosition].redo(app, app.buffer) : false;
		}
		/** @returns {string} */
		function dump() {
			return logs.dump();
		}
		function notifySave() {
			savedAt = logs.item(currentPosition) || null;
		}
		// `publish` installs the real surface below (enumerable, with computed
		// accessors) but is opaque to the type checker. Naming the members here
		// gives the instance the `WasaviEditLogger` shape; `publish` then
		// redefines each with its final property descriptor.
		this.clear = clear;
		this.open = open;
		this.close = close;
		this.write = write;
		this.undo = undo;
		this.redo = redo;
		this.dump = dump;
		this.notifySave = notifySave;
		this.logMax = max;
		this.clusterNestLevel = -1;
		this.logLength = 0;
		this.currentPosition = 0;
		this.isClean = false;

		publish(this,
			clear, open, close, write, undo, redo, dump, notifySave,
			{
				logMax:[
					function () {
						return max;
					},
					/** @param {number} v */
					function (v) {
						if (typeof v != 'number' || v < 0) {
							throw new TypeError('EditLogger: invalid logMax');
						}
						max = v;
						logs.trim(max);
						currentPosition = logs.length - 1;
					}
				],
				clusterNestLevel:function () {
					return cluster ? cluster.nestLevel : -1;
				},
				logLength:function () {
					return logs.length;
				},
				currentPosition:function () {
					return currentPosition;
				},
				isClean:function () {
					return currentPosition < 0 || currentPosition >= logs.length ?
						!savedAt : logs.item(currentPosition) == savedAt;
				}
			}
		);

		clear();
	}
}
Wasavi.EditLogger = EditLogger;

})(typeof globalThis == 'object' ? globalThis : window);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
