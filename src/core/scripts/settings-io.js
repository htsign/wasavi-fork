/**
 * pure import/export helpers for the options page
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
'use strict';

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

function isValidSettingValue (key, value, knownTargetIds) {
	if (key == 'targets') {
		if (value == null || typeof value != 'object' || Array.isArray(value)) {
			return false;
		}
		// only the known target checkboxes, each carrying a boolean
		return Object.keys(value).every(function (k) {
			return knownTargetIds.indexOf(k) >= 0 && typeof value[k] == 'boolean';
		});
	}
	return typeof value == SETTING_TYPES[key];
}

function timestamp (date) {
	var d = date || new Date();
	return '' + d.getFullYear() +
		String(d.getMonth() + 1).padStart(2, '0') +
		String(d.getDate()).padStart(2, '0') +
		String(d.getHours()).padStart(2, '0') +
		String(d.getMinutes()).padStart(2, '0') +
		String(d.getSeconds()).padStart(2, '0');
}

function exportFilename (date) {
	return 'wasavi-fork_' + timestamp(date) + '.json';
}

function buildExportEnvelope (settings, version, now) {
	return {
		format: 'wasavi-fork-settings',
		version: version,
		exportedAt: now.toISOString(),
		settings: settings
	};
}

function parseImportData (text, knownTargetIds) {
	var data;
	try {
		data = JSON.parse(text);
	}
	catch (ex) {
		return {ok: false, reason: 'invalid-json'};
	}

	if (!data ||
		typeof data != 'object' ||
		data.format !== 'wasavi-fork-settings' ||
		!data.settings ||
		typeof data.settings != 'object') {
		return {ok: false, reason: 'invalid-format'};
	}

	var items = [];
	SETTING_KEYS.forEach(function (key) {
		// own property only: `in` would also accept keys inherited from a
		// polluted Object.prototype, importing values the file never carried
		if (Object.prototype.hasOwnProperty.call(data.settings, key) &&
			isValidSettingValue(key, data.settings[key], knownTargetIds)) {
			items.push({key: key, value: data.settings[key]});
		}
	});

	if (items.length == 0) {
		return {ok: false, reason: 'no-valid-settings'};
	}

	return {ok: true, items: items};
}

var SettingsIO = {
	SETTING_KEYS: SETTING_KEYS,
	SETTING_TYPES: SETTING_TYPES,
	isValidSettingValue: isValidSettingValue,
	timestamp: timestamp,
	exportFilename: exportFilename,
	buildExportEnvelope: buildExportEnvelope,
	parseImportData: parseImportData
};

if (typeof module != 'undefined' && module.exports) {
	module.exports = SettingsIO;
}
else {
	global.SettingsIO = SettingsIO;
}

})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
