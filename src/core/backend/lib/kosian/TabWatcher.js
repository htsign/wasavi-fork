/**
 * tab watcher
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

	var u = require('./Utils').Utils;

	/*
	 * base class
	 */

	function TabWatcher (emit) {}

	TabWatcher.prototype = {
		add: function (id, url, callback) {
			emit(callback, null);
		}
	};

	/*
	 * for chrome
	 */

	function ChromeTabWatcher (emit) {
		var targets = {};

		function handleTabUpdate (tabId, changeInfo, tab) {
			if (!targets[tabId] || !changeInfo.url) return;
			var target = targets[tabId];
			var isGoalUrl = u.baseUrl(tab.url) == u.baseUrl(target.goalUrl);
			if (tab.url == '' || isGoalUrl) {
				emit(target.callback, tab.url);
				delete targets[tabId];
				if (u.countOf(targets) == 0) {
					chrome.tabs.onUpdated.removeListener(handleTabUpdate);
					chrome.tabs.onRemoved.removeListener(handleTabRemove);
				}
			}
		}

		function handleTabRemove (tabId, removeInfo) {
			if (!targets[tabId]) return;
			emit(targets[tabId].callback, '');
			delete targets[tabId];
			if (u.countOf(targets) == 0) {
				chrome.tabs.onUpdated.removeListener(handleTabUpdate);
				chrome.tabs.onRemoved.removeListener(handleTabRemove);
			}
		}

		this.add = function (id, url, callback) {
			chrome.tabs.get(id, function (tab) {
				if (u.countOf(targets) == 0) {
					chrome.tabs.onUpdated.addListener(handleTabUpdate);
					chrome.tabs.onRemoved.addListener(handleTabRemove);
				}
				targets[id] = {tab:id, startUrl:tab.url, goalUrl:url, callback:callback};
			});
		};
	}

	ChromeTabWatcher.prototype.constructor = TabWatcher;

	/*
	 * exports
	 */

	function create (window, emit) {
		if (window.chrome) {
			return new ChromeTabWatcher(emit);
		}
		return new TabWatcher;
	}

	exports.TabWatcher = create;
})();

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
