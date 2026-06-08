'use strict';

const assert = require('assert');
const {describe, it} = require('node:test');

// the export is a factory (returns a new instance), so it is called, not `new`ed
const SimilarityComputer = require('../core/backend/lib/SimilarityComputer.js').SimilarityComputer;

const approx = (actual, expected) =>
	assert.ok(Math.abs(actual - expected) < 1e-9, actual + ' !~ ' + expected);

describe('SimilarityComputer', () => {
	describe('getNgram', () => {
		it('should split into n-grams of the unit size', () => {
			assert.deepEqual(SimilarityComputer(3).getNgram('abcd'), {abc: 1, bcd: 1});
		});

		it('should strip whitespace before splitting', () => {
			assert.deepEqual(SimilarityComputer(3).getNgram('a b\tc'), {abc: 1});
		});

		it('should yield nothing for text shorter than the unit size', () => {
			assert.deepEqual(SimilarityComputer(3).getNgram('ab'), {});
		});
	});

	describe('getCommonLength / getUnionLength', () => {
		const sc = SimilarityComputer(3);

		it('should count shared keys and the summed key counts', () => {
			const a = {ab: 1, bc: 1};
			const b = {bc: 1, cd: 1};
			assert.equal(sc.getCommonLength(a, b), 1);
			assert.equal(sc.getUnionLength(a, b), 4);
		});
	});

	describe('getNgramRatio', () => {
		const sc = SimilarityComputer(3);

		it('should be 1.0 for identical strings', () => {
			approx(sc.getNgramRatio('hello', 'hello'), 1.0);
		});

		it('should be 0 for strings with no shared n-grams', () => {
			approx(sc.getNgramRatio('abc', 'xyz'), 0);
		});

		it('should accept pre-computed n-gram objects', () => {
			approx(sc.getNgramRatio({foo: 1}, {foo: 1}), 1.0);
		});

		it('should fall back to the Levenshtein ratio for short strings', () => {
			// 'ab'/'ac' are shorter than unit size 3 -> Levenshtein (dist 1, max len 2)
			approx(sc.getNgramRatio('ab', 'ac'), 0.5);
		});

		it('should throw on invalid arguments', () => {
			assert.throws(() => sc.getNgramRatio(1, 2), /invalid arguments/);
		});
	});

	describe('getLevenshteinRatio', () => {
		const sc = SimilarityComputer(3);

		it('should be 1.0 for two empty strings', () => {
			approx(sc.getLevenshteinRatio('', ''), 1.0);
		});

		it('should be 1.0 for identical strings', () => {
			approx(sc.getLevenshteinRatio('abc', 'abc'), 1.0);
		});

		it('should reflect a single edit over the longer length', () => {
			approx(sc.getLevenshteinRatio('cat', 'hat'), 1 - 1 / 3);
		});
	});

	describe('getNgramRatio2', () => {
		const sc = SimilarityComputer(3);

		it('should compare strings directly when either is short', () => {
			approx(sc.getNgramRatio2('ab', 'ac', null, null), 0.5);
		});

		it('should compare the pre-computed n-grams when both are long enough', () => {
			const ng = sc.getNgram('hello');
			// strings differ, but the supplied n-grams are identical -> 1.0
			approx(sc.getNgramRatio2('hello', 'jelly', ng, ng), 1.0);
		});
	});
});

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
