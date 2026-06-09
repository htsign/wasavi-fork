'use strict';

const assert = require('node:assert/strict');
const {describe, it, before, after} = require('node:test');

// extension_wrapper.js targets the browser: it reads bare `window` / `document`
// at load time (the bootstrap at the bottom evaluates urlInfo.isExternal, which
// touches window.location). Stub just enough of them on the Node global so the
// module body can be required, then restore afterwards so sibling test files in
// the same `node --test` process are not affected.
let WasaviExtensionWrapper;
const savedWindow = global.window;
const savedDocument = global.document;

before(() => {
	global.window = {
		location: {href: 'https://wasavi.appsweets.net/', protocol: 'https:'}
	};
	global.document = {
		documentElement: {setAttribute() {}}
	};
	WasaviExtensionWrapper =
		require('../core/frontend/extension_wrapper.js').WasaviExtensionWrapper;
});

after(() => {
	global.window = savedWindow;
	global.document = savedDocument;
});

describe('ExtensionWrapper.create override', () => {
	const urlInfo = () => WasaviExtensionWrapper.urlInfo;

	it('externalSecureUrl option overrides externalSecureFrameURL', () => {
		// regression: the option used to assign to an undeclared variable, which
		// threw ReferenceError under strict mode instead of overriding the URL.
		assert.doesNotThrow(() => {
			WasaviExtensionWrapper.create({externalSecureUrl: 'https://override.test/'});
		});
		assert.equal(urlInfo().externalSecureUrl, 'https://override.test/');
	});

	it('the override is reflected through frameSource over https', () => {
		// window.location.protocol is 'https:', so frameSource returns the secure URL
		WasaviExtensionWrapper.create({externalSecureUrl: 'https://secure.test/'});
		assert.equal(urlInfo().frameSource, 'https://secure.test/');
	});

	it('externalFrameURL and extensionName options still apply', () => {
		WasaviExtensionWrapper.create({
			extensionName: 'wasavi-test',
			externalFrameURL: 'http://plain.test/'
		});
		assert.equal(urlInfo().externalUrl, 'http://plain.test/');
		assert.equal(new WasaviExtensionWrapper().name, 'wasavi-test');
	});
});

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
