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
	const AUTHORIZE_RETRY_MAX = 1;
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
	 * file writing binder class
	 */

	function WriteBinder (fs, writeCore, delaySecs) {
		var writeTimer;
		var writeBuffer = {};

		function handleWriteTimer () {
			writeTimer = null;

			try {
				for (var i in writeBuffer) {
					writeCore(writeBuffer[i]);
				}
			}
			finally {
				writeBuffer = {};
			}
		}

		function write (task) {
			if (!writeTimer) {
				var ds = delaySecs;
				if (task.options
				&& 'delaySecs' in task.options
				&& typeof task.options.delaySecs == 'number') {
					ds = Math.max(0.1, task.options.delaySecs);
				}
				writeTimer = u.setTimeout(handleWriteTimer, 1000 * ds);
			}
			writeBuffer[task.path] = task;
			fs.response(task, {state: 'buffered', path: task.path});
		}

		delaySecs || (delaySecs = writeDelaySecsDefault);
		this.write = write;
	}

	/*
	 * file system base class
	 */

	function FileSystem (extension, options) {
		this.extension = extension;
		options || (options = {});

		var self = this;
		var accessToken = '';
		var refreshToken = '';
		var tokenType = '';
		var uid = '';
		var locale = '';

		var handleError = this.handleError = function (task, status) {
			DEBUG && console.log('handleError: task:' + task.task + ', status:' + status);

			// 400 Bad Request
			// 401 Unauthorized
			// 403 Forbidden
			if ((status == 400 || status == 401 || status == 403) &&
				(refreshToken || task.refreshToken)) {
				if (self.taskQueue.topTask &&
					self.taskQueue.topTask.task == 'authorize' &&
					self.taskQueue.topTask.retryCount >= AUTHORIZE_RETRY_MAX) {
					return false;
				}

				self.isAuthorized = false;
				self.taskQueue.run(task);

				if (refreshToken && !self.taskQueue.topTask.refreshToken) {
					self.taskQueue.topTask.refreshToken = refreshToken;
				}

				self.taskQueue.topTask.state = 'access-token-expired';
				self.taskQueue.topTask.retryCount++;
				accessToken = refreshToken = tokenType = uid = locale = '';
				return true;
			}
			return false;
		};

		var handleAuthError = this.handleAuthError = function (task, message, status) {
			DEBUG && console.log('handleAuthError: task:' + task.task + ', message:' + message + ', status:' + status);

			self.isAuthorized = false;
			accessToken = refreshToken = tokenType = uid = locale = '';

			delete task.accessToken;
			delete task.refreshToken;
			delete task.tokenType;
			delete task.uid;

			if ((status == 400 || status == 401 || status == 403) &&
				task.retryCount < AUTHORIZE_RETRY_MAX) {
				task.state = 'initial-state';
				task.retryCount++;
			}
			else {
				task.state = 'error';
				task.message = message;
			}
			self.taskQueue.run();
		};

		this.authorizeOAuth2 = function (authOpts) {
			/*
			 * task: {
			 *   task: 'authorize',
			 *   state: 'initial-state',
			 *   retryCount: 0,
			 *   tabId: the tab id of related task
			 *   options: the options of related task
			 *
			 *   // set at fetching-authorization-code
			 *   csrfToken:
			 *
			 *   // set at got-code
			 *   code:
			 *
			 *   // set at pre-authorized
			 *   accessToken:
			 *   tokenType:
			 *   refreshToken:
			 *   uid:
			 * }
			 *
			 * authOpts: {
			 *   consumerKey:
			 *   consumerSecret:
			 *   startUrl:
			 *   callbackUrl:
			 *   exchangeUrl:
			 *   validateUrl:
			 *   validateUserIdKey:
			 *   scopes:
			 * }
			 */
			return function authorize (task) {
				if (task.task != 'authorize') {
					return self.handleAuthError(
						task,
						_('Not a authentication task: {0}', task.task));
				}

				DEBUG && console.log('FileSystem#authorize: state: ' + task.state);

				switch (task.state) {
				case 'error':
					self.responseError(task, {
						app_filesystem_error: [task.message || _('Unknown file system error')]
					});
					self.taskQueue.run();
					break;

				case 'initial-state':
					task.state = 'fetching-authorization-code';
					self.response(task, {state: 'authorizing', phase: '1/3'});

					task.csrfToken = Math.floor(Math.random() * 0x80000000).toString(16);

					var params = {
						response_type: 'code',
						client_id: authOpts.consumerKey,
						redirect_uri: authOpts.callbackUrl,
						state: task.csrfToken
					};
					if ('scopes' in authOpts) {
						params.scope = authOpts.scopes.join(' ');
					}

					extension.openTabWithUrl(
						u.getFullUrl(authOpts.startUrl, params),
						null,
						function (id, url) {
							if (task.state != 'fetching-authorization-code') {
								return handleAuthError(
									task,
									_('Invalid authentication state (fat): {0}', task.state));
							}

							// advance the state
							task.state = 'waiting-tab-switch';

							// watch browser tab
							extension.tabWatcher.add(id, authOpts.callbackUrl, function (newUrl) {
								if (task.state != 'waiting-tab-switch') {
									return handleAuthError(
										task,
										_('Invalid authentication state (wts): {0}', task.state));
								}

								extension.closeTab(id);

								if (task.tabId != null) {
									extension.focusTab(task.tabId);
								}

								var q = u.queryToObject(newUrl);
								DEBUG && console.log('FileSystem#authorize: tabwatcher callback: q: ' + JSON.stringify(q));
								if ('error' in q) {
									return handleAuthError(
										task,
										_('Authentication declined: {0}', q.error));
								}
								if (!('state' in q && 'code' in q)) {
									return handleAuthError(
										task,
										_('Invalid authorization response'));
								}

								// ensure csrfToken is valid
								if (q.state != task.csrfToken) {
									return handleAuthError(
										task,
										_('CSRF Token not matched'));
								}

								// advance the state
								task.state = 'got-code';
								task.code = q.code;
								self.taskQueue.run();
								DEBUG && console.log('FileSystem#authorize: state switched to ' + task.state);
							});
						}
					);
					break;

				case 'got-code':
				case 'access-token-expired':
					var param;
					if (task.state == 'got-code') {
						param = {
							code: task.code,
							grant_type: 'authorization_code',
							client_id: authOpts.consumerKey,
							client_secret: authOpts.consumerSecret,
							redirect_uri: authOpts.callbackUrl
						};
					}
					else {
						param = {
							refresh_token: task.refreshToken,
							grant_type: 'refresh_token',
							client_id: authOpts.consumerKey,
							client_secret: authOpts.consumerSecret
						};
					}

					// advance the state
					task.state = 'fetching-access-token';
					self.response(task, {state: 'authorizing', phase: '2/3'});

					extension.request(
						authOpts.exchangeUrl,
						{
							method: 'POST',
							content: param,
							responseType: 'json'
						},
						function (data, status) {
							DEBUG && console.log('FileSystem#authorize: ' + task.state + ' on ' + task.task + ' task succeed: ' + JSON.stringify(data));

							if (task.state != 'fetching-access-token') {
								return handleAuthError(
									task,
									_('Invalid authentication state (eca): {0}', task.state));
							}
							if (status != 200) {
								return handleAuthError(
									task,
									_('Invalid status code #{0}', status));
							}
							if (!('access_token' in data && 'token_type' in data)) {
								return handleAuthError(
									task,
									_('Invalid content response: ' + JSON.stringify(data)));
							}

							// advance the state
							task.state = 'pre-authorized';

							// store access token and token type
							task.accessToken = data.access_token;
							task.tokenType = data.token_type;

							// store refresh token if exists
							if ('refresh_token' in data) {
								task.refreshToken = data.refresh_token;
							}

							// store user id if exists
							if (authOpts.validateUserIdKey in data) {
								task.uid = data[authOpts.validateUserIdKey];
							}

							self.taskQueue.run();
							DEBUG && console.log('FileSystem#authorize: state switched to ' + task.state);
						},
						function () {
							DEBUG && console.log('FileSystem#authorize: ' + task.state + ' on ' + task.task + ' task fail: ' + JSON.stringify(data));

							handleAuthError(task);
						}
					);
					break;

				case 'pre-authorized':
					// advance the state
					task.state = 'fetching-account-info';
					self.response(task, {state: 'authorizing', phase: '3/3'});

					extension.request(
						authOpts.validateUrl,
						{
							method: authOpts.validateMethod || 'POST',
							accessToken: task.accessToken,
							tokenType: task.tokenType,
							responseType: 'json'
						},
						function (data, status) {
							DEBUG && console.log('FileSystem#authorize: ' + task.state + ' on ' + task.task + ' task succeed: ' + JSON.stringify(data));

							if (task.state != 'fetching-account-info') {
								return handleAuthError(
									task,
									_('Invalid authentication state (fai): {0}', task.state));
							}
							if (status != 200) {
								return handleAuthError(
									task,
									_('Invalid status code #{0}', status));
							}

							// validate user ID
							if ('uid' in task) {
								if (!(authOpts.validateUserIdKey in data)
								|| data[authOpts.validateUserIdKey] != task.uid) {
									return handleAuthError(
										task,
										_('User unmatch.'));
								}
							}

							// advance the state
							task.state = 'authorized';
							accessToken = task.accessToken;
							refreshToken = task.refreshToken;
							tokenType = task.tokenType;
							uid = data[authOpts.validateUserIdKey];
							locale = data.locale;

							self.saveCredentials({
								token: accessToken,
								refresh: refreshToken,
								type: tokenType,
								uid: uid
							});

							self.isAuthorized = true;
							self.taskQueue.run();
							DEBUG && console.log('FileSystem#authorize: authorized');
						},
						function (data, status) {
							DEBUG && console.log('FileSystem#authorize: ' + task.state + ' on ' + task.task + ' task fail: ' + JSON.stringify(data));

							if (handleError(task, status)) return;

							handleAuthError(
								task,
								_('Failed to validate access token.'), status);
						}
					);
					break;

				default:
					handleAuthError(
						task,
						_('Invalid authentication state: {0}', task.state));
					break;
				}
			};
		};

		this.request = function (url, opts, success, failure) {
			if (accessToken != '' && tokenType != '') {
				opts || (opts = {});
				if (!('accessToken' in opts)) {
					opts.accessToken = accessToken;
				}
				if (!('tokenType' in opts)) {
					opts.tokenType = tokenType;
				}
			}
			return this.extension.request(url, opts, success, failure);
		};

		this.__defineGetter__('locale', function () {return locale});
		this.__defineGetter__('uid', function () {return uid});
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
