/**
 * online storage interface
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

(function () {
	'use strict';

	/*
	 * consts
	 */

	const DEBUG = false;
	const PSEUDO_MIME_DIRECTORY = 'application/x-kosian-directory';
	const PSEUDO_MIME_GENERIC = 'application/octet-stream';
	const u = require('./Utils').Utils;
	const _ = u._;

	/*
	 * vars
	 */

	var writeDelaySecsDefault = 10;

	/*
	 * task queue class
	 */

	function TaskQueue (fs, authorize, ls, read, write) {
		var queue = [];
		var timer;

		function process () {
			timer = null;

			if (queue.length == 0) return;

			var top = queue.shift();
			switch (top.task) {
			case 'authorize':
				if (!fs.needAuthentication || fs.isAuthorized) {
					DEBUG && console.log('TaskQueue#process: nothing to do');
					run();
					break;
				}
				if (top.state == 'error') {
					DEBUG && console.log('TaskQueue#process: error');
					queue.shift();
					authorize(top);
				}
				else {
					DEBUG && console.log('TaskQueue#process: calling authroize');
					queue.unshift(top);
					authorize(top);
				}
				break;
			case 'ls':
				DEBUG && console.log('TaskQueue#process: calling ls');
				ls(top);
				break;
			case 'read':
				DEBUG && console.log('TaskQueue#process: calling read');
				read(top);
				break;
			case 'write':
				DEBUG && console.log('TaskQueue#process: calling write');
				write(top);
				break;
			}
		}

		function pushAuthorizeTask (referencedTask) {
			queue.unshift({
				task: 'authorize',
				state: 'initial-state',
				retryCount: 0,
				tabId: referencedTask && referencedTask.tabId,
				options: referencedTask && referencedTask.options
			});
		}

		function push (task) {
			if (!task) return;

			if (fs.needAuthentication && !fs.isAuthorized) {
				if (queue.length == 0 || queue[0].task != 'authorize') {
					pushAuthorizeTask(task);
				}
				else {
					if (!queue[0].tabId && task.tabId) {
						queue[0].tabId = task.tabId;
					}
					if (!queue[0].options && task.options) {
						queue[0].options = task.options;
					}
				}
			}

			if (task.task != 'authorize') {
				queue.push(task);
			}
		}

		function run (task) {
			push(task);

			if (!timer) {
				timer = u.setTimeout(process, 100);
			}
		}

		function getTopTask () {
			return queue[0];
		}

		function initCredentials (keys, callback) {
			var obj = fs.loadCredentials();

			if (!obj) return;
			//if (keys.some(function (key) {return !(key in obj)})) return;

			pushAuthorizeTask();
			queue[0].state = 'pre-authorized';

			try {
				callback(obj);
			}
			catch (e) {
			}
		}

		fs.ls = function (path, tabId, options) {
			run({
				task: 'ls',
				tabId: tabId,
				path: this.getInternalPath(path),
				options: options || {}
			});
		};
		fs.write = function (path, tabId, content, options) {
			run({
				task: 'write',
				tabId: tabId,
				path: this.getInternalPath(path),
				content: content,
				options: options || {}
			});
		};
		fs.read = function (path, tabId, options) {
			run({
				task: 'read',
				tabId: tabId,
				path: this.getInternalPath(path),
				options: options || {}
			});
		};

		this.initCredentials = initCredentials;
		this.push = push;
		this.run = run;
		this.__defineGetter__('topTask', getTopTask);
	}

	/*
	 * file system base class
	 */

	function FileSystem (extension, options) {
		this.extension = extension;
		options || (options = {});
	}

	FileSystem.prototype = {
		backend: '*null*',
		needAuthentication: true,
		isAuthorized: false,
		write: function (path, content, tabId, options) {
			this.response({task: 'write', tabId: tabId, options: options}, {
				error: 'not implemented'
			});
		},
		read: function (path, tabId) {
			this.response({task: 'read', tabId: tabId}, {
				error: 'not implemented'
			});
		},
		ls: function (path, tabId, options) {
			options && this.extension.emit(options.onload, {});
		},
		response: function (task, data) {
			if (!task.options) {
				return;
			}

			var options = task.options;
			var name = typeof options.externalName == 'string' ?
				options.externalName : task.task;

			data.type = 'fileio-' + name + '-response';
			this.extension.emit(options.onresponse, data, task);
		},
		responseError: function (task, data) {
			var errorMessage = false;

			switch (u.objectType(data)) {
			case 'Object':
				if (errorMessage === false && 'text' in data) {
					var jsonData = u.parseJson(data.text);

					switch (u.objectType(jsonData.error)) {
					case 'String':
						errorMessage = [jsonData.error];
						break;

					case 'Object':
						errorMessage = [jsonData.error[Object.keys(jsonData.error)[0]]];
						break;
					}
				}
				if (errorMessage === false && 'status' in data) {
					switch (data.status) {
					case 404:
						errorMessage = _('File not found.');
						break;
					}
				}
				if (errorMessage === false && 'app_filesystem_error' in data) {
					errorMessage = data.app_filesystem_error;
				}
				break;

			case 'Array':
				errorMessage = data;
				break;

			default:
				errorMessage = [data + ''];
				break;
			}

			this.extension.isDev && console.error(
				this.extension.appName + ' background: file system error: ' + errorMessage.join(', '));

			this.response(task, {error: errorMessage});
			task.options && this.extension.emit(task.options.onerror, errorMessage);
		},
		getInternalPath: function (path) {
			var schema = this.backend + ':';
			if (path.indexOf(schema) == 0) {
				path = path.substring(schema.length);
			}
			return path;
		},
		getExternalPath: function (path) {
			if (path.charAt(0) != '/') {
				path = '/' + path;
			}
			return this.backend + ':' + path;
		},
		getPathPrefix: function (fragments, root) {
			var prefix = Array.prototype.slice.call(fragments);
			var rootFragments = u.splitPath(root);
			while (rootFragments.length) {
				rootFragments.shift();
				prefix.shift();
			}
			return prefix;
		},
		match: function (url) {
			return url.indexOf(this.backend + ':') == 0;
		},
		get credentialKeyName () {
			return 'filesystem.' + this.backend + '.tokens';
		},
		saveCredentials: function (data) {
			this.extension.storage.setItem(this.credentialKeyName, data);
		},
		loadCredentials: function () {
			return this.extension.storage.getItem(this.credentialKeyName);
		},
		clearCredentials: function () {
			this.extension.storage.setItem(this.credentialKeyName, undefined);
		}
	};

	/*
	 * file system class for local file system
	 * this class depends on Chrome apps named "Local File Operator for wasavi"
	 */

	function FileSystemLocalFileChrome (extension, options) {

		/*
		 * tasks
		 */

		function ls (task) {
			chrome.runtime.sendMessage(
				LFO_ID,
				{
					command: 'ls',
					path: task.path
				},
				function (response) {
					if (chrome.runtime.lastError) {
						return self.responseError(
							task, chrome.runtime.lastError.message);
					}
					else if (!response) {
						return self.responseError(
							task, _('Invalid response.'));
					}
					else if (response.error) {
						return self.responseError(
							task, response.error);
					}

					var data = {
						name: response.name,
						size: '',
						bytes: 0,
						path: response.path,
						is_dir: true,
						is_deleted: false,
						id: null,
						modified: null,
						created: null,
						mime_type: PSEUDO_MIME_DIRECTORY,
						contents: response.entries
					};

					self.response(task, {data: data});
					extension.emit(task.options.onload, data);
				}
			);
			taskQueue.run();
		}

		function read (task) {
			self.response(task, {state: 'reading', progress: 0});

			chrome.runtime.sendMessage(
				LFO_ID,
				{
					command: 'read',
					path: task.path
				},
				function (response) {
					try {
						if (chrome.runtime.lastError) {
							return self.responseError(
								task, chrome.runtime.lastError.message);
						}
						else if (!response) {
							return self.responseError(
								task, _('Invalid response.'));
						}
						else if (response.error) {
							return self.responseError(
								task, response.error);
						}

						self.response(task, {
							state: 'complete',
							status: 200,
							content: response.content,
							meta: {
								name: response.name,
								size: u.readableSize(response.size),
								bytes: response.size,
								path: self.getExternalPath(response.path),
								is_dir: false,
								is_deleted: false,
								id: null,
								modified: new Date(response.lastModified),
								created: null,
								mime_type: PSEUDO_MIME_GENERIC,
							}
						});
					}
					finally {
						taskQueue.run();
					}
				}
			);
		}

		function write (task) {
			self.response(task, {state: 'writing', progress: 0});

			chrome.runtime.sendMessage(
				LFO_ID,
				{
					command: 'write',
					path: task.path,
					content: task.content
				},
				function (response) {
					try {
						if (chrome.runtime.lastError) {
							return self.responseError(
								task, chrome.runtime.lastError.message);
						}
						else if (!response) {
							return self.responseError(
								task, _('Invalid response.'));
						}
						else if (response.error) {
							return self.responseError(
								task, response.error);
						}

						self.response(task, {
							state: 'complete',
							status: 200,
							meta: {
								name: response.name,
								size: u.readableSize(response.size),
								bytes: response.size,
								path: self.getExternalPath(response.path),
								is_dir: false,
								is_deleted: false,
								id: null,
								modified: null,
								created: null,
								mime_type: PSEUDO_MIME_GENERIC
							}
						});
					}
					finally {
						taskQueue.run();
					}
				}
			);
		}

		/*
		 * init
		 */

		FileSystem.apply(this, arguments);
		this.backend = 'file';
		this.needAuthentication = false;
		var self = this;
		var taskQueue = this.taskQueue = new TaskQueue(this, null, ls, read, write);
		//var LFO_ID = 'igbjeepbgpdcjmpcjgkkfgelekeigbhc';	// develop version
		var LFO_ID = 'dkbdmkncpnepdbaneikhbbeiboehjnol';	// release version
	}

	FileSystemLocalFileChrome.prototype = Object.create(FileSystem.prototype);
	FileSystemLocalFileChrome.prototype.constructor = FileSystemLocalFileChrome;

	/*
	 * export
	 */

	function FileSystemImpl (name, ext, options) {
		switch (name) {
		case 'file':
			return new FileSystemLocalFileChrome(ext, options);
		default:
			return new FileSystem(ext, options);
		}
	}

	FileSystemImpl.setWriteDelaySecs = function (secs) {
		writeDelaySecsDefault = secs;
	};

	exports.FileSystemImpl = FileSystemImpl;
})();

// vim:set ts=4 sw=4 fenc=UTF-8 ff=unix ft=javascript fdm=marker :
