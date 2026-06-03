/**
 * clipboard manager
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

(function () {
	'use strict';

	//
	function Clipboard () {}
	Clipboard.prototype = {
		set: function (data) {},
		get: function (callback) {callback && callback('')}
	};

	//
	function ExecCommandClipboard () {}
	ExecCommandClipboard.prototype = Object.create(Clipboard.prototype, {
		setViaExecCommand: {value: function (data) {
			var buffer = document.getElementById('clipboard-buffer');
			data || (data = '');
			try {
				if (buffer && data != '') {
					buffer.value = data;
					buffer.focus();
					buffer.select();
					document.execCommand('cut');
				}
			}
			catch (e) {
			}
		}},
		getViaExecCommand: {value: function () {
			var buffer = document.getElementById('clipboard-buffer');
			var data = '';
			try {
				if (buffer) {
					buffer.value = '';
					buffer.focus();
					document.execCommand('paste');
					data = buffer.value;
				}
			}
			catch (e) {
				data = '';
			}
			return data;
		}},
		set: {value: function (data) {
			data || (data = '');
			if (data == '') {
				return;
			}
			var that = this;
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(data).catch(function () {
					that.setViaExecCommand(data);
				});
			}
			else {
				this.setViaExecCommand(data);
			}
		}},
		get: {value: function (callback) {
			callback || (callback = function () {});
			var that = this;
			if (navigator.clipboard && navigator.clipboard.readText) {
				navigator.clipboard.readText().then(function (text) {
					callback(text);
				}, function () {
					callback(that.getViaExecCommand());
				});
			}
			else {
				callback(this.getViaExecCommand());
			}
		}}
	});
	ExecCommandClipboard.prototype.constructor = Clipboard;

	//
	function create (window) {
		if (window.chrome) {
			return new ExecCommandClipboard;
		}
		else {
			return new Clipboard;
		}
	}

	exports.Clipboard = create;
})();

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
