'use strict';

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

require('../core/frontend/init.js');
require('../core/frontend/utils.js');

describe('execGenerator', () => {
	it('should resolve with the generator return value', async () => {
		function* gen () {
			return 42;
		}
		const result = await execGenerator(gen, null);
		assert.equal(result, 42);
	});

	it('should feed a resolved Promise value back into the generator', async () => {
		/** @type {number[]} */
		const seen = [];
		function* gen () {
			const a = yield Promise.resolve(10);
			seen.push(a);
			const b = yield Promise.resolve(a + 5);
			seen.push(b);
			return a + b;
		}
		const result = await execGenerator(gen, null);
		assert.deepEqual(seen, [10, 15]);
		assert.equal(result, 25);
	});

	it('should feed a non-Promise yielded value straight back', async () => {
		function* gen () {
			const a = yield 7;
			return a * 2;
		}
		const result = await execGenerator(gen, null);
		assert.equal(result, 14);
	});

	it('should bind thisObj and pass through arguments', async () => {
		const obj = {base: 100};
		function* gen (x, y) {
			return this.base + x + y;
		}
		const result = await execGenerator(gen, obj, 2, 3);
		assert.equal(result, 105);
	});

	it('should reject when a yielded Promise rejects', async () => {
		function* gen () {
			yield Promise.reject(new Error('boom'));
			return 'unreachable';
		}
		await assert.rejects(execGenerator(gen, null), /boom/);
	});

	it('should surface a rejected Promise into the generator via throw', async () => {
		function* gen () {
			try {
				yield Promise.reject(new Error('boom'));
				return 'no-throw';
			}
			catch (e) {
				return 'caught:' + e.message;
			}
		}
		const result = await execGenerator(gen, null);
		assert.equal(result, 'caught:boom');
	});

	it('should reject when the generator throws synchronously', async () => {
		function* gen () {
			throw new Error('sync-fail');
			// eslint-disable-next-line no-unreachable
			yield 1;
		}
		await assert.rejects(execGenerator(gen, null), /sync-fail/);
	});

	it('should throw a TypeError when the first argument is not a generator', () => {
		assert.throws(
			() => execGenerator(function () {}, null),
			TypeError);
	});
});
