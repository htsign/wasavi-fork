'use strict';

const assert = require('assert');
const fs = require('fs');
const {describe, it} = require('node:test');

require('../core/frontend/init.js');
require('../core/frontend/utils.js');

const unicodeUtils = require('../core/frontend/unicode_utils.js').unicodeUtils;

function loadDict () {
	return fs.readFileSync(
		__dirname + '/../core/unicode/linebreak.dat',
		'binary');
}

const TEST_DATA_PATH = __dirname + '/../unicode-tools/ucd/auxiliary/LineBreakTest.txt';

function loadTestData () {
	return fs.readFileSync(TEST_DATA_PATH, 'utf8');
}

// the UCD test data (LineBreakTest.txt) is a developer-local artifact that is
// neither committed nor fetched by any build step, so skip when it is absent.
const hasTestData = fs.existsSync(TEST_DATA_PATH);

(hasTestData ? describe : describe.skip)('class LineBreakder', function () {
	var dictData = loadDict();
	var testData = loadTestData();
	var count = 0;
	var countLimit = -1;
	var lineBreaker = new unicodeUtils.LineBreaker(dictData);

	testData.split('\n').forEach(function (line) {
		// cut a comment off
		var comment = /#(.*)$/.exec(line);
		line = line.replace(/#.*$/, '').replace(/^\s+|\s+$/g, '');

		// return if the line is just a comment
		if (line == '') return;

		count++;

		// for debug
		if (countLimit > 0 && count > countLimit) return;

		// parse the rule.
		// example:
        // × 0023 × 0023 ÷
        // × 0023 × 0020 ÷ 0023 ÷
		var s = '';
		var codePointCount = 0;
		var rules = [];
		line.split(/\s+/).forEach(function (node) {
			if (/^[0-9a-fA-F]+$/.test(node)) {
				s += unicodeUtils.toUTF16(parseInt(node, 16));
				codePointCount++;
			}
			else {
				switch (node.charCodeAt(0)) {
				case 0x00d7:// × prohibited
					rules.push(false);
					break;

				case 0x00f7:// ÷ allowed
					rules.push(true);
					break;
				}
			}
		});

		// make test function
		it(`test #${count} (${line})`, (function (count, codePointCount, s, rules) {
			return function () {
				assert.equal(codePointCount, rules.length - 1);

				var lb = lineBreaker.run(s);
				assert.ok(lb, 'ensure line break info is an object');
				assert.ok('length' in lb, 'ensure line info has length property');

				/*
				console.log(
					'test #' + count + ', line: "' + line + '", "' + s + '"\n' +
					JSON.stringify(lb, null, ' ')
				);
				*/

				assert.equal(lb.length, rules.length - 1, 'test line break info count');

				for (var i = 0, goal = lb.length; i < goal; i++) {
					assert.strictEqual(
						unicodeUtils.canBreak(lb[i].breakAction),
						rules[i + 1],
						'index ' + i);
				}
			}
		})(count, codePointCount, s, rules));
	});
});

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
