'use strict';

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const SettingsIO = require('../core/scripts/settings-io.js');

// the target checkboxes the options page would expose to the validator
const KNOWN_TARGETS = ['enableTextArea', 'enableText', 'enableSearch'];

// a settings object that exercises every key with a valid value
function fullSettings () {
	return {
		exrc: 'set number',
		targets: {enableTextArea: true, enableText: false, enableSearch: true},
		quickActivation: true,
		shortcut: '<c-enter>',
		siteOverrides: 'example.com',
		fontFamily: 'monospace',
		logMode: false,
		upgradeNotify: true
	};
}

describe('SettingsIO.timestamp', () => {
	it('should format a date as yyyyMMddHHmmss with zero padding', () => {
		// local-time constructor so the assertion is timezone independent
		assert.equal(
			SettingsIO.timestamp(new Date(2017, 0, 2, 3, 4, 5)),
			'20170102030405');
	});

	it('should not zero-pad the year', () => {
		assert.equal(
			SettingsIO.timestamp(new Date(2017, 11, 31, 23, 59, 59)),
			'20171231235959');
	});
});

describe('SettingsIO.exportFilename', () => {
	it('should wrap the timestamp in the wasavi-fork_*.json name', () => {
		assert.equal(
			SettingsIO.exportFilename(new Date(2017, 0, 2, 3, 4, 5)),
			'wasavi-fork_20170102030405.json');
	});
});

describe('SettingsIO.buildExportEnvelope', () => {
	it('should carry the format marker, version, exportedAt and settings', () => {
		const settings = fullSettings();
		const now = new Date('2017-01-02T03:04:05.000Z');
		const env = SettingsIO.buildExportEnvelope(settings, '0.8.2', now);

		assert.equal(env.format, 'wasavi-fork-settings');
		assert.equal(env.version, '0.8.2');
		assert.equal(env.exportedAt, now.toISOString());
		assert.strictEqual(env.settings, settings);
	});
});

describe('SettingsIO.isValidSettingValue', () => {
	it('should accept strings for string-typed keys', () => {
		['exrc', 'shortcut', 'siteOverrides', 'fontFamily'].forEach(key => {
			assert.equal(SettingsIO.isValidSettingValue(key, 'x', KNOWN_TARGETS), true);
			assert.equal(SettingsIO.isValidSettingValue(key, 1, KNOWN_TARGETS), false);
		});
	});

	it('should accept booleans for boolean-typed keys', () => {
		['quickActivation', 'logMode', 'upgradeNotify'].forEach(key => {
			assert.equal(SettingsIO.isValidSettingValue(key, true, KNOWN_TARGETS), true);
			assert.equal(SettingsIO.isValidSettingValue(key, 'true', KNOWN_TARGETS), false);
		});
	});

	it('should accept targets whose keys are all known and values boolean', () => {
		assert.equal(
			SettingsIO.isValidSettingValue(
				'targets', {enableTextArea: true, enableText: false}, KNOWN_TARGETS),
			true);
	});

	it('should reject targets carrying an unknown key', () => {
		assert.equal(
			SettingsIO.isValidSettingValue(
				'targets', {enableTextArea: true, bogus: true}, KNOWN_TARGETS),
			false);
	});

	it('should reject targets with a non-boolean value', () => {
		assert.equal(
			SettingsIO.isValidSettingValue(
				'targets', {enableTextArea: 'yes'}, KNOWN_TARGETS),
			false);
	});

	it('should reject array and null as targets', () => {
		assert.equal(SettingsIO.isValidSettingValue('targets', [], KNOWN_TARGETS), false);
		assert.equal(SettingsIO.isValidSettingValue('targets', null, KNOWN_TARGETS), false);
	});
});

describe('SettingsIO.parseImportData', () => {
	function envelopeJson (settings) {
		return JSON.stringify(SettingsIO.buildExportEnvelope(
			settings, '0.8.2', new Date('2017-01-02T03:04:05.000Z')));
	}

	it('should round-trip a full settings export', () => {
		const settings = fullSettings();
		const result = SettingsIO.parseImportData(envelopeJson(settings), KNOWN_TARGETS);

		assert.equal(result.ok, true);
		assert.equal(result.items.length, SettingsIO.SETTING_KEYS.length);

		const got = {};
		result.items.forEach(item => {got[item.key] = item.value});
		assert.deepEqual(got, settings);
	});

	it('should reject invalid JSON', () => {
		const result = SettingsIO.parseImportData('{', KNOWN_TARGETS);
		assert.equal(result.ok, false);
		assert.equal(result.reason, 'invalid-json');
	});

	it('should reject a wrong format marker', () => {
		const json = JSON.stringify({format: 'something-else', settings: {exrc: 'x'}});
		const result = SettingsIO.parseImportData(json, KNOWN_TARGETS);
		assert.equal(result.ok, false);
		assert.equal(result.reason, 'invalid-format');
	});

	it('should reject a missing settings object', () => {
		const json = JSON.stringify({format: 'wasavi-fork-settings'});
		const result = SettingsIO.parseImportData(json, KNOWN_TARGETS);
		assert.equal(result.ok, false);
		assert.equal(result.reason, 'invalid-format');
	});

	it('should reject non-object JSON values', () => {
		// falsy primitives and arrays are not valid envelopes
		['0', 'false', 'null', '""', '[]'].forEach(json => {
			const result = SettingsIO.parseImportData(json, KNOWN_TARGETS);
			assert.equal(result.ok, false, json + ' should be rejected');
			assert.equal(result.reason, 'invalid-format', json);
		});
	});

	it('should ignore unknown keys but keep valid known keys', () => {
		const json = envelopeJson({exrc: 'set number', bogusKey: 'ignored'});
		const result = SettingsIO.parseImportData(json, KNOWN_TARGETS);

		assert.equal(result.ok, true);
		assert.equal(result.items.length, 1);
		assert.equal(result.items[0].key, 'exrc');
		assert.equal(result.items[0].value, 'set number');
	});

	it('should report no-valid-settings when every value is malformed', () => {
		const json = envelopeJson({exrc: 123, quickActivation: 'nope'});
		const result = SettingsIO.parseImportData(json, KNOWN_TARGETS);
		assert.equal(result.ok, false);
		assert.equal(result.reason, 'no-valid-settings');
	});

	it('should ignore keys inherited from a polluted prototype', () => {
		// the parsed settings only carries fontFamily as an own property; an
		// allowlisted key living on Object.prototype must not leak in
		Object.prototype.exrc = 'injected';
		try {
			const json = envelopeJson({fontFamily: 'monospace'});
			const result = SettingsIO.parseImportData(json, KNOWN_TARGETS);
			assert.equal(result.ok, true);
			assert.deepEqual(result.items.map(i => i.key), ['fontFamily']);
		}
		finally {
			delete Object.prototype.exrc;
		}
	});
});

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
