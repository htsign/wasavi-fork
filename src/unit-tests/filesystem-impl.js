'use strict';

const assert = require('assert');
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
});

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
