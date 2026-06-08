'use strict';

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const {FileSystemImpl} = require('../core/backend/lib/kosian/FileSystemImpl.js');

// the factory only stashes the reference at construction, so a no-op stub is
// enough to exercise which backend each name resolves to
const ext = {emit() {}};

describe('FileSystemImpl factory', () => {
	it('should wire the local-file backend for "file"', () => {
		const fs = FileSystemImpl('file', ext, {});
		assert.equal(fs.constructor.name, 'FileSystemLocalFileChrome');
		assert.equal(fs.backend, 'file');
	});

	it('should not provide any cloud storage backend', () => {
		// dropbox / gdrive / onedrive were removed when storage was fixed to the
		// local filesystem; every non-"file" name must fall through to the null
		// stub instead of resolving to a real cloud backend.
		['dropbox', 'gdrive', 'onedrive'].forEach(name => {
			const fs = FileSystemImpl(name, ext, {});
			assert.equal(fs.backend, '*null*', name + ' must not resolve to a real backend');
		});
	});

	it('should fall back to the null stub for an unknown backend name', () => {
		const fs = FileSystemImpl('totally-unknown', ext, {});
		assert.equal(fs.backend, '*null*');
	});

	it('should fall back to the null stub for a null backend name', () => {
		// the default fstab entry resolves the backend via FileSystemImpl(null, ...)
		const fs = FileSystemImpl(null, ext, {});
		assert.equal(fs.constructor.name, 'FileSystem');
		assert.equal(fs.backend, '*null*');
	});
});

describe('FileSystemLocalFileChrome inherited surface', () => {
	// exercising methods that live on the base FileSystem proves the prototype
	// chain set up by `extends` actually delivers behaviour, not just `.backend`
	const fs = FileSystemImpl('file', ext, {});

	it('should map between external and internal paths via the file scheme', () => {
		assert.equal(fs.getExternalPath('/x'), 'file:/x');
		assert.equal(fs.getInternalPath('file:/x'), '/x');
	});

	it('should match only its own scheme', () => {
		assert.equal(fs.match('file:/y'), true);
		assert.equal(fs.match('dropbox:/y'), false);
	});

	it('should expose the credential key name for the file backend', () => {
		assert.equal(fs.credentialKeyName, 'filesystem.file.tokens');
	});
});

describe('FileSystem null-stub responses', () => {
	// an ext stub that records every emit, so the null stub's dispatch is observable
	function makeRecordingExt() {
		const emitted = [];
		return {
			emitted,
			emit(ev, ...args) {emitted.push({ev, args})},
			getMessage: x => x
		};
	}

	it('read should emit a fileio-read-response carrying the original tabId', () => {
		const ext = makeRecordingExt();
		const fs = FileSystemImpl(null, ext, {});
		fs.read('/p', 42, {onresponse: 'onresp', externalName: 'read'});
		assert.equal(ext.emitted.length, 1);
		const [data, task] = ext.emitted[0].args;
		assert.equal(ext.emitted[0].ev, 'onresp');
		assert.equal(data.type, 'fileio-read-response');
		assert.equal(task.tabId, 42);
	});

	it('write should emit with the tabId, not the content', () => {
		const ext = makeRecordingExt();
		const fs = FileSystemImpl(null, ext, {});
		fs.write('/p', 42, 'CONTENT', {onresponse: 'onresp', externalName: 'write'});
		assert.equal(ext.emitted.length, 1);
		const [data, task] = ext.emitted[0].args;
		assert.equal(data.type, 'fileio-write-response');
		assert.equal(task.tabId, 42, 'tabId must be 42, never the content string');
	});

	it('read/write without options stay silent', () => {
		const ext = makeRecordingExt();
		const fs = FileSystemImpl(null, ext, {});
		fs.read('/p', 42);
		fs.write('/p', 42, 'CONTENT');
		assert.equal(ext.emitted.length, 0);
	});
});

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
