'use strict';

const assert = require('assert');
const {describe, it} = require('node:test');

require('../core/frontend/init.js');
require('../core/frontend/utils.js');
require('../core/frontend/classes.js');

describe('class Position', () => {
	it('should store row and col', () => {
		const p = new Wasavi.Position(5, 10);
		assert.equal(p.row, 5);
		assert.equal(p.col, 10);
	});

	it('should stringify as [object Position(row,col)]', () => {
		assert.equal(new Wasavi.Position(2, 3).toString(), '[object Position(2,3)]');
	});

	it('should clone into an independent copy', () => {
		const p = new Wasavi.Position(5, 10);
		const c = p.clone();
		assert.equal(c.row, 5);
		assert.equal(c.col, 10);
		p.row = 99;
		p.col = 88;
		assert.equal(c.row, 5);
		assert.equal(c.col, 10);
	});

	describe('isp', () => {
		const p = new Wasavi.Position(0, 0);

		it('should accept a Position instance', () => {
			assert.ok(p.isp(new Wasavi.Position(1, 1)));
		});

		it('should accept a plain {row, col} object', () => {
			assert.ok(p.isp({row: 1, col: 2}));
		});

		it('should reject null and incomplete objects', () => {
			assert.ok(!p.isp(null));
			assert.ok(!p.isp({}));
			assert.ok(!p.isp({row: 1}));
			assert.ok(!p.isp({col: 1}));
		});
	});

	describe('comparisons', () => {
		const at = (r, c) => new Wasavi.Position(r, c);

		it('eq should be true only for the same row and col', () => {
			assert.ok(at(5, 10).eq(at(5, 10)));
			assert.ok(at(5, 10).eq({row: 5, col: 10}));
			assert.ok(!at(5, 10).eq(at(5, 11)));
			assert.ok(!at(5, 10).eq(at(6, 10)));
		});

		it('ne should be the negation of eq for valid operands', () => {
			assert.ok(!at(5, 10).ne(at(5, 10)));
			assert.ok(at(5, 10).ne(at(5, 11)));
		});

		it('gt/lt should order by row first, then col', () => {
			assert.ok(at(6, 0).gt(at(5, 99)));   // higher row wins
			assert.ok(at(5, 11).gt(at(5, 10)));  // same row, higher col
			assert.ok(!at(5, 10).gt(at(5, 10))); // equal is not greater
			assert.ok(at(5, 9).lt(at(5, 10)));
			assert.ok(at(4, 99).lt(at(5, 0)));
			assert.ok(!at(5, 10).lt(at(5, 10)));
		});

		it('ge/le should include the equal case', () => {
			assert.ok(at(5, 10).ge(at(5, 10)));
			assert.ok(at(5, 11).ge(at(5, 10)));
			assert.ok(!at(5, 9).ge(at(5, 10)));
			assert.ok(at(5, 10).le(at(5, 10)));
			assert.ok(at(5, 9).le(at(5, 10)));
			assert.ok(!at(5, 11).le(at(5, 10)));
		});

		it('comparisons against invalid operands are falsy', () => {
			assert.ok(!at(5, 10).gt(null));
			assert.ok(!at(5, 10).lt({}));
		});
	});

	describe('round', () => {
		// minimal buffer stub: rowLength and rows(n).length drive the clamp
		const buffer = {
			rowLength: 3,
			rows(n) {
				return ['abcde', 'fg', 'hij'][n];
			}
		};

		it('should clamp the row into [0, rowLength - 1]', () => {
			assert.deepEqual(roundedAt(-5, 0), {row: 0, col: 0});
			assert.equal(new Wasavi.Position(99, 0).round(buffer).row, 2);
		});

		it('should clamp the col to the row length, keeping one slot off the last row', () => {
			// non-last row (1): col limited to rows(1).length - 1 = 1
			assert.deepEqual(roundedAt(1, 10), {row: 1, col: 1});
			// last row (2): col limited to rows(2).length = 3
			assert.deepEqual(roundedAt(5, 10), {row: 2, col: 3});
		});

		it('should clamp a negative col to 0', () => {
			assert.deepEqual(roundedAt(1, -9), {row: 1, col: 0});
		});

		it('should return itself for chaining', () => {
			const p = new Wasavi.Position(1, 1);
			assert.ok(p.round(buffer) instanceof Wasavi.Position);
		});

		function roundedAt (r, c) {
			const p = new Wasavi.Position(r, c).round(buffer);
			return {row: p.row, col: p.col};
		}
	});
});

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
