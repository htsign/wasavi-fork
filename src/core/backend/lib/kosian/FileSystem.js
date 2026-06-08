/**
 * file system interface
 *
 * @author akahuku@gmail.com
 */
/**
 * Copyright 2012-2017 akahuku, akahuku@gmail.com
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

	function FileSystem (ext, fstab) {
		if (!(this instanceof FileSystem)) {
			return new FileSystem(ext, fstab);
		}

		this.ext = ext || require('./Kosian').Kosian();
		this.fstab = fstab;
		this.init();
	}

	FileSystem.prototype.init = function () {
		var FileSystemImpl = require('./FileSystemImpl').FileSystemImpl;

		for (var i in this.fstab) {
			this.fstab[i].isNull = false;
			this.fstab[i].instance = FileSystemImpl(i, this.ext);
		}

		this.fstab.nullFs = {
			enabled: true,
			isNull: true,
			instance: FileSystemImpl(null, this.ext)
		};
	};

	FileSystem.prototype.getInstance = function (path) {
		var defaultFs;
		var nullFs;
		var drive = '';

		path.replace(/^([^\/:]+):/, function ($0, $1) {
			drive = $1;
			return '';
		});

		if (drive != '' && drive in this.fstab && this.fstab[drive].enabled) {
			return this.fstab[drive].instance;
		}

		for (var i in this.fstab) {
			var fs = this.fstab[i];
			if (!fs || !fs.instance) {
				continue;
			}
			if (fs.isDefault) {
				defaultFs = fs.instance;
			}
			if (fs.isNull) {
				nullFs = fs.instance;
			}
		}
		return drive != '' ? nullFs : (defaultFs || nullFs);
	};

	FileSystem.prototype.getInfo = function () {
		var result = [];
		for (var i in this.fstab) {
			var fs = this.fstab[i];
			if (!fs || fs.isNull) continue;
			result.push({
				name:i,
				enabled:fs.enabled,
				isDefault:fs.isDefault
			});
		}
		return result;
	};

	FileSystem.prototype.setInfo = function (info) {
		var defaultFilesystem = null;

		for (var i in this.fstab) {
			if (this.fstab[i].isDefault) {
				defaultFilesystem = i;
				delete this.fstab[i].isDefault;
			}
		}

		for (var i in this.fstab) {
			if (!(i in info)) continue;
			if (!this.fstab[i] || this.fstab[i].isNull) continue;

			if ('isDefault' in info[i]) {
				this.fstab[i].isDefault = !!info[i].isDefault;
				defaultFilesystem = null;
			}

			if ('enabled' in info[i]) {
				this.fstab[i].enabled = !!info[i].enabled;
			}
		}

		if (defaultFilesystem != null) {
			this.fstab[defaultFilesystem].isDefault = true;
		}
	}

	FileSystem.prototype.clearCredentials = function (target) {
		Object.keys(this.fstab).forEach(function (name) {
			var fs = this.fstab[name];
			if (!fs || !fs.instance || typeof fs.instance.clearCredentials != 'function') return;
			if (typeof target == 'string') {
				if (target == name) {
					fs.instance.clearCredentials();
				}
			}
			else {
				fs.instance.clearCredentials();
			}
		}, this);
	};

	FileSystem.prototype.ls = function (path) {
		var fs = this.getInstance(path);
		fs.ls.apply(fs, arguments);
	};

	FileSystem.prototype.write = function (path) {
		var fs = this.getInstance(path);
		fs.write.apply(fs, arguments);
	};

	FileSystem.prototype.read = function (path) {
		var fs = this.getInstance(path);
		fs.read.apply(fs, arguments);
	};

	exports.FileSystem = FileSystem;
})(this);

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
