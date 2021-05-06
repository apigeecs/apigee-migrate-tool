"use strict";

const request = require('request');

module.exports = function (grunt, userid, passwd) {
	let max_concurrent_requests = Number(grunt.option("concurrent-requests"));
	let pending_tasks = [];
	let running_tasks = 0;

	const canStartTask = function () {
		let can_start = false;

		if (max_concurrent_requests > 0) {
			can_start = running_tasks < max_concurrent_requests;
		}
		else {
			can_start = true;
		}

		return can_start;
	};

	const startTasks = function () {
		while (canStartTask() && (pending_tasks.length > 0)) {
			let task = pending_tasks.shift();
			task();
		}
	}
	const enqueueRequest = function (createRequest, onRequest = null) {
		pending_tasks.push(function () {
			++running_tasks;

			let req = this.createRequest();

			if (this.onRequest) {
				this.onRequest(req);
			}

			req.auth(userid, passwd, true);
		}.bind({ createRequest: createRequest, onRequest: onRequest }));

		startTasks();
	};

	const completion = function (callback) {
		return function (error, response, body) {
			if (this.callback)
				this.callback(error, response, body);

			--running_tasks;
		}.bind({ callback: callback });
	};


	const waitForGet = function (url, callback = null, onRequest = null) {
		enqueueRequest(function () {
			return request(this.url, completion(this.callback));
		}.bind({ url: url, callback: callback }), onRequest);
	}

	const waitForPost = function (url, opts, callback = null, onRequest = null) {
		enqueueRequest(function () {
			return request.post({ url: this.url, ...this.opts }, completion(this.callback));
		}.bind({ url: url, opts: opts, callback: callback }), onRequest);
	}

	const waitForPut = function (url, opts, callback = null, onRequest = null) {
		enqueueRequest(function () {
			return request.put({ url: this.url, ...this.opts }, completion(this.callback));
		}.bind({ url: url, opts: opts, callback: callback }), onRequest);
	}

	const waitForDelete = function (url, callback = null, onRequest = null) {
		enqueueRequest(function () {
			return request.del(this.url, completion(this.callback));
		}.bind({ url: url, callback: callback }), onRequest);
	}

	const waitForCompletion = function (donecb = null) {
		let progressInterval = setInterval(function () {

			if ((running_tasks <= 0) && (pending_tasks.length <= 0)) {
				clearInterval(execInterval);
				clearInterval(progressInterval);

				if (donecb)
					donecb();
			}
			else {
				if (max_concurrent_requests > 0) {
					grunt.verbose.writeln(`Waiting for ${running_tasks}/${max_concurrent_requests} running and ${pending_tasks.length} queued requests`);
				}
				else {
					grunt.verbose.writeln(`Waiting for ${running_tasks} running requests`);
				}
			}
		}, 1000);

		let execInterval = setInterval(function () {
			startTasks();
		}, 100);
	}

	return { waitForGet, waitForPost, waitForPut, waitForDelete, waitForCompletion };
}