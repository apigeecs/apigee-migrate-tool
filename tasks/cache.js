/*jslint node: true */
'use strict';

const path = require('path');
const apigee = require('../config.js');
const asyncrequest = require('../util/asyncrequest.lib.js');


module.exports = function (grunt) {
	grunt.registerTask('exportCaches', 'Export all caches from org ' + apigee.from.org + ' environment ' + apigee.from.env + " [" + apigee.from.version + "]", function () {
		let url = apigee.from.url;
		let org = apigee.from.org;
		let env = apigee.from.env;
		let userid = apigee.from.userid;
		let passwd = apigee.from.passwd;
		let filepath = grunt.config.get("exportCaches.dest.data");
		let caches = [];
		let done = this.async();

		const { waitForGet, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		grunt.verbose.writeln("========================= export Caches ===========================");

		// Get virtual host list
		grunt.verbose.writeln("getting caches..." + url);
		url = url + "/v1/organizations/" + org + "/environments/" + env + "/caches";

		waitForGet(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				grunt.log.write("CACHES: " + body);
				caches = JSON.parse(body);

				grunt.file.mkdir(filepath);

				for (let i = 0; i < caches.length; i++) {
					let cache_url = url + "/" + caches[i];
					let cache_path = path.join(filepath, caches[i]);

					// Get virtual host details
					grunt.verbose.writeln("CACHE URL: " + cache_url.length + " " + cache_url);
					waitForGet(cache_url, function (error, response, body) {
						if (!error && response.statusCode == 200) {
							grunt.verbose.writeln("CACHE " + body);
							let cache_detail = JSON.parse(body);

							grunt.file.write(cache_path, body);

							grunt.verbose.writeln('Exported cache ' + cache_detail.name);
						}
						else {
							grunt.log.error('Error ' + response.statusCode + ' exporting Cache from ' + cache_url);
							if (error) {
								grunt.log.error(error);
							}
						}
					});

					// End virtual host details
				};
			}
			else {
				grunt.log.error(error);
			}
		});

		waitForCompletion(function () {
			if (caches.length <= 0) {
				grunt.verbose.writeln("No Virtual Hosts");
			}
			else {
				grunt.log.ok('Processed ' + caches.length + ' virtual hosts');
			}
			grunt.verbose.writeln("================== export virtual hosts DONE()");

			done();
		});
	});

	grunt.registerMultiTask('importCaches', 'Import all caches to org ' + apigee.to.org + ' environment ' + apigee.to.env + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let env = apigee.to.env;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let caches = this.filesSrc;
		let done = this.async();

		const { waitForPost, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		grunt.verbose.writeln("========================= import Caches ===========================");

		// Build source list
		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			caches = grunt.file.expand(opts, f);
		}

		url = url + "/v1/organizations/" + org + "/environments/" + env + "/caches";

		// Create virtual hosts
		caches.forEach(function (cachePath) {
			let cacheName = path.basename(cachePath);

			let content = grunt.file.read(cachePath);

			grunt.verbose.writeln("Creating cache " + cacheName);
			waitForPost(url, {
				headers: { 'content-type': 'application/json' },
				body: content
			}, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;

				if (!error && status == 201) {
					grunt.verbose.writeln('Resp [' + status + '] for cache creation ' + this.url + ' -> ' + body);
					grunt.verbose.writeln('Created cache ' + this.cacheName);
				}
				else {
					grunt.log.error('ERROR Resp [' + status + '] for cache creation ' + this.cacheName + ' -> ' + body);
					if (error) {
						grunt.log.error(error);
					}
				}
			}.bind({ url: url, cacheName: cacheName }));
		});

		waitForCompletion(function () {
			if (caches.length <= 0) {
				grunt.verbose.writeln("No caches");
			}
			else {
				grunt.log.ok('Processed ' + caches.length + ' caches');
			}
			grunt.verbose.writeln("================== import caches DONE()");

			done();
		});
	});

	grunt.registerMultiTask('deleteCaches', 'Delete all caches from org ' + apigee.to.org + ' environment ' + apigee.to.env + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let env = apigee.to.env;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let caches = this.filesSrc;
		let done = this.async();

		const { waitForDelete, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		grunt.verbose.writeln("========================= delete Caches ===========================");

		// Build virtual host list
		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			caches = grunt.file.expand(opts, f);
		}

		url = url + "/v1/organizations/" + org + "/environments/" + env + "/caches";

		// Delete virtual hosts
		caches.forEach(function (cachePath) {
			let cacheName = path.basename(cachePath);

			let del_url = url + "/" + cacheName;
			waitForDelete(del_url, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;

				if (!error && status == 200) {
					grunt.verbose.writeln('Resp [' + status + '] for cache deletion ' + this.url + ' -> ' + body);
					grunt.verbose.writeln('Deleted cache ' + this.cacheName);
				}
				else {
					grunt.log.error('ERROR Resp [' + status + '] for cache deletion ' + this.cacheName + ' -> ' + body);
					if (error) {
						grunt.log.error(error);
					}
				}
			}.bind({ url: del_url, cacheName: cacheName }));
		});

		waitForCompletion(function () {
			if (caches.length <= 0) {
				grunt.verbose.writeln("No caches");
			}
			else {
				grunt.log.ok('Deleted ' + caches.length + ' caches');
			}
			grunt.verbose.writeln("================== delete Caches DONE()");

			done();
		});
	});
};
