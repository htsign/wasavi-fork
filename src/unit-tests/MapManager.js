'use strict';

const assert = require('node:assert/strict');
const {describe, it, after} = require('node:test');

require('../core/frontend/init.js');
require('../core/frontend/utils.js');
require('../core/frontend/qeema.js');
require('../core/frontend/classes.js');

describe('class MapManager', () => {
	function createMapManager () {
		const mm = new Wasavi.MapManager({
			keyManager: qeema,
			config: {
				vars: {
					remap: true
				}
			}
		});
		mm.maps.normal.register('a', 'gg', true);
		mm.maps.normal.register('b', 'B', true);
		mm.maps.normal.register('bb', '^', true);
		mm.maps.normal.register('h', 'l', true);
		mm.maps.normal.register('Q', '1G', true);
		mm.maps.normal.register('QQ', 'G', true);
		return mm;
	}

	it('should return an unmapped key as it is', (t, done) => {
		const mm = createMapManager();

		// z -> z
		const e1 = qeema.parseKeyDesc('z').prop;
		mm.process('command', e1)
		.then(e => {
			assert.equal(e.code, e1.code);
			assert.equal(mm.isWaiting, false);
			done();
		});
	});

	it('should resolve unique mache', (t, done) => {
		const mm = createMapManager();
		mm.onexpand = sequences => {
			assert.equal(sequences.length, 1);
			assert.equal(sequences[0].char, 'l');
			assert.equal(mm.isWaiting, false);
			done();
		};

		// h -> l
		const e1 = qeema.parseKeyDesc('h').prop;
		mm.process('command', e1)
		.then(e => {
			assert.equal(e, undefined);
		});
	});

	it('should resolve ambiguous matches by timeout', (t, done) => {
		const mm = createMapManager();
		mm.onexpand = sequences => {
			assert.equal(sequences.length, 1);
			assert.equal(sequences[0].char, 'B');
			assert.equal(mm.isWaiting, false);
			done();
		};

		// b -> B
		const e1 = qeema.parseKeyDesc('b').prop;
		mm.process('command', e1)
		.then(e => {
			assert.equal(e, undefined);
		});
	});

	it('should resolve ambiguous matches by subsequent input', (t, done) => {
		const mm = createMapManager();
		mm.onexpand = sequences => {
			assert.equal(sequences.length, 1);
			assert.equal(sequences[0].char, '^');
			assert.equal(mm.isWaiting, false);
			done();
		};

		// bb -> ^
		const e1 = qeema.parseKeyDesc('b').prop;
		mm.process('command', e1)
		.then(e => {
			assert.equal(e, undefined);
			return mm.process('command', e1);
		})
		.then(e => {
			assert.equal(e, undefined);
		});
	});

	it('should resolve an ambiguous match when the next key arrives in another mode', (t, done) => {
		const mm = createMapManager();
		mm.onexpand = sequences => {
			assert.equal(sequences.length, 2);

			// the waiting command-mode `b` expands to its rhs `B`, tagged with
			// the map *type* of the waiting map (normal), not the mode name
			assert.equal(sequences[0].char, 'B');
			assert.equal(sequences[0].overrideMap, 'normal');
			assert.equal(sequences[0].mapExpanded, true);

			// the trailing key is carried over tagged with the second mode's
			// map type (insert -> input)
			assert.equal(sequences[1].char, 'b');
			assert.equal(sequences[1].overrideMap, 'input');

			assert.equal(mm.isWaiting, false);
			done();
		};

		// <command>b<insert>b -> <command>B<insert>b
		const e1 = qeema.parseKeyDesc('b').prop;
		mm.process('command', e1)
		.then(e => {
			assert.equal(e, undefined);
			return mm.process('insert', qeema.parseKeyDesc('b').prop);
		})
		.then(e => {
			assert.equal(e, undefined);
		});
	});

	it('should resolve halfway input by timeout #1', (t, done) => {
		const mm = createMapManager();
		mm.maps.normal.remove('b', 'bb');
		mm.maps.normal.register('bbb', 'B');
		mm.maps.normal.register('bbbb', '^');
		mm.onexpand = sequences => {
			assert.equal(sequences.length, 1);
			assert.equal(sequences[0].char, 'b');
			assert.equal(sequences[0].isNoremap, true);
			assert.equal(mm.isWaiting, false);
			done();
		};

		// b -> b
		const e1 = qeema.parseKeyDesc('b').prop;
		mm.process('command', e1)
		.then(e => {
			assert.equal(e, undefined);
		});
	});

	it('should resolve halfway input by timeout #2', (t, done) => {
		const mm = createMapManager();
		mm.maps.normal.remove('b', 'bb');
		mm.maps.normal.register('bbb', 'B');
		mm.maps.normal.register('bbbb', '^');
		mm.onexpand = sequences => {
			assert.equal(sequences.length, 2);
			assert.equal(sequences[0].char, 'b');
			assert.equal(sequences[0].isNoremap, true);
			assert.equal(sequences[1].char, 'b');
			assert.equal(sequences[1].isNoremap, true);
			assert.equal(mm.isWaiting, false);
			done();
		};

		// bb -> bb
		const e1 = qeema.parseKeyDesc('b').prop;
		mm.process('command', e1)
		.then(e => {
			assert.equal(e, undefined);
			return mm.process('command', e1);
		})
		.then(e => {
			assert.equal(e, undefined);
		});
	});

	it('should resolve halfway input by unmapped key #1', (t, done) => {
		const mm = createMapManager();
		mm.maps.normal.remove('b', 'bb');
		mm.maps.normal.register('bbb', 'B');
		mm.maps.normal.register('bbbb', '^');
		mm.onexpand = sequences => {
			assert.equal(sequences.length, 3, '#0');
			assert.equal(sequences[0].char, 'b', '#1');
			assert.equal(sequences[0].isNoremap, true, '#2');
			assert.equal(sequences[1].char, 'b', '#3');
			assert.equal(sequences[1].isNoremap, true, '#4');
			assert.equal(sequences[2].char, 'Z', '#5');
			assert.equal(sequences[2].isNoremap, true, '#6');
			assert.equal(mm.isWaiting, false);
			done();
		};

		// bbZ -> bbZ
		mm.process('command', qeema.parseKeyDesc('b').prop)
		.then(e => {
			assert.equal(e, undefined);
			return mm.process('command', qeema.parseKeyDesc('b').prop);
		})
		.then(e => {
			assert.equal(e, undefined);
			return mm.process('command', qeema.parseKeyDesc('Z').prop);
		})
		.then(e => {
			assert.equal(e, undefined);
		});
	});

	it('should resolve halfway input by unmapped key #2', (t, done) => {
		const mm = createMapManager();
		mm.onexpand = sequences => {
			assert.equal(sequences.length, 3);
			assert.equal(sequences[0].char, '1');
			assert.equal(sequences[1].char, 'G');
			assert.equal(sequences[2].char, 'j');
			done();
		};

		// Qj -> 1Gj
		mm.process('command', qeema.parseKeyDesc('Q').prop)
		.then(e => {
			assert.equal(e, undefined);
			return mm.process('command', qeema.parseKeyDesc('j').prop);
		})
		.then(e => {
			assert.equal(e, undefined);
		});
	});

	after((t, done) => {
		setTimeout(done, 1000);
	});
});
