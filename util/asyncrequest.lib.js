"use strict";

const request = require('request');

module.exports = function (grunt, userid, passwd) {
	let pending_tasks = 0;

	const waitForGet = function (url, callback = null) {
		++pending_tasks;
		let r = request(url, function (error, response, body) {
			if (callback)
				callback(error, response, body);

			--pending_tasks;
		}).auth(userid, passwd, true);

		return r;
	}

	const waitForPost = function (url, opts, callback = null) {
		++pending_tasks;
		let r = request.post({ url: url, ...opts }, function (error, response, body) {
			if (callback)
				callback(error, response, body);

			--pending_tasks;
		}).auth(userid, passwd, true);

		return r;
	}

	const waitForPut = function (url, opts, callback = null) {
		++pending_tasks;
		let r = request.put({ url: url, ...opts }, function (error, response, body) {
			if (callback)
				callback(error, response, body);

			--pending_tasks;
		}).auth(userid, passwd, true);

		return r;
	}

	const waitForDelete = function (url, callback = null) {
		++pending_tasks;
		let r = request.del(url, function (error, response, body) {
			if (callback)
				callback(error, response, body);

			--pending_tasks;
		}).auth(userid, passwd, true);

		return r;
	}

	const waitForCompletion = function (donecb = null) {
		let intervalId = setInterval(function () {
			if (pending_tasks <= 0) {
				if (donecb)
					donecb();

				clearInterval(intervalId);
			}
			else {
				grunt.verbose.writeln(`Waiting for ${pending_tasks} pending requests`);
			}
		}, 1000);
	}

	return { waitForGet, waitForPost, waitForPut, waitForDelete, waitForCompletion };
}