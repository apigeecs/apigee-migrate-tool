/*jslint node: true */
'use strict';

const { profileEnd } = require('console');
const path = require('path');
const request = require('request');
const apigee = require('../config.js');


module.exports = function (grunt) {
	grunt.registerTask('exportReferences', 'Export all references from org ' + apigee.from.org + ' environment ' + apigee.from.env + " [" + apigee.from.version + "]", function () {
		let url = apigee.from.url;
		let org = apigee.from.org;
		let env = apigee.from.env;
		let userid = apigee.from.userid;
		let passwd = apigee.from.passwd;
		let filepath = grunt.config.get("exportReferences.dest.data");
		let refs = [];
		let pending_tasks = 0;
		let done = this.async();

		const waitForRequest = function (url, callback) {
			++pending_tasks;
			let r = request(url, function (error, response, body) {
				callback(error, response, body);
				--pending_tasks;
			}).auth(userid, passwd, true);

			return r;
		}

		grunt.verbose.writeln("========================= export References ===========================");

		// Get reference list
		grunt.verbose.writeln("getting references..." + url);
		url = url + "/v1/organizations/" + org + "/environments/" + env + "/references";

		waitForRequest(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				grunt.log.write("REFERENCES: " + body);
				refs = JSON.parse(body);

				grunt.file.mkdir(filepath);

				for (let i = 0; i < refs.length; i++) {
					let ref_url = url + "/" + refs[i];
					let ref_path = path.join(filepath, refs[i]);

					// Get reference details
					grunt.verbose.writeln("REFERENCE URL: " + ref_url.length + " " + ref_url);
					waitForRequest(ref_url, function (error, response, body) {
						if (!error && response.statusCode == 200) {
							grunt.verbose.writeln("REFERENCE " + body);
							let ref_detail = JSON.parse(body);

							grunt.file.write(ref_path, body);

							grunt.verbose.writeln('Exported reference ' + ref_detail.name);
						}
						else {
							grunt.log.error('Error ' + response.statusCode + ' exporting Reference from ' + ref_url);
							if (error) {
								grunt.log.error(error);
							}
						}
					});

					// End reference details
				};
			}
			else {
				grunt.log.error(error);
			}
		});

		// Set a 1s timer to wait for pending requests to complete
		let intervalId = setInterval(function () {
			if (pending_tasks <= 0) {
				if (refs.length <= 0) {
					grunt.verbose.writeln("No References");
				}
				else {
					grunt.log.ok('Processed ' + refs.length + ' references');
				}
				grunt.verbose.writeln("================== export references DONE()");

				clearInterval(intervalId);
				done();
			}
			else {
				grunt.verbose.writeln('Waiting for ' + pending_tasks + ' pending requests');
			}
		}, 1000);
	});

	grunt.registerMultiTask('importReferences', 'Import all references to org ' + apigee.to.org + ' environment ' + apigee.to.env + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let env = apigee.to.env;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let refs = this.filesSrc;
		let pending_tasks = 0;
		let done = this.async();

		const waitForPost = function (url, opts, callback) {
			let boundcb = callback.bind({ url: url });

			++pending_tasks;
			let r = request.post({ url: url, ...opts }, function (error, response, body) {
				boundcb(error, response, body);
				--pending_tasks;
			}).auth(userid, passwd, true);

			return r;
		}

		grunt.verbose.writeln("========================= import References ===========================");

		// Build source list
		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			refs = grunt.file.expand(opts, f);
		}

		url = url + "/v1/organizations/" + org + "/environments/" + env + "/references";

		// Create references
		refs.forEach(function (refPath) {
			let refName = path.basename(refPath);

			let content = grunt.file.read(refPath);

			grunt.verbose.writeln("Creating reference " + refName);
			waitForPost(url, {
				headers: { 'content-type': 'application/json' },
				body: content
			}, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;

				if (!error && status == 201) {
					grunt.verbose.writeln('Resp [' + status + '] for reference creation ' + this.url + ' -> ' + body);
					grunt.verbose.writeln('Created reference ' + refName);
				}
				else {
					grunt.log.error('ERROR Resp [' + status + '] for reference creation ' + this.url + ' -> ' + body);
					if (error) {
						grunt.log.error(error);
					}
				}
			});
		});

		// Set a 1s timer to wait for pending requests to complete
		let intervalId = setInterval(function () {
			if (pending_tasks <= 0) {
				if (refs.length <= 0) {
					grunt.verbose.writeln("No References");
				}
				else {
					grunt.log.ok('Processed ' + refs.length + ' references');
				}
				grunt.verbose.writeln("================== import references DONE()");

				clearInterval(intervalId);
				done();
			}
			else {
				grunt.verbose.writeln('Waiting for ' + pending_tasks + ' pending requests');
			}
		}, 1000);
	});

	grunt.registerMultiTask('deleteReferences', 'Delete all references from org ' + apigee.to.org + ' environment ' + apigee.to.env + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let env = apigee.to.env;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let refs = this.filesSrc;
		let pending_tasks = 0;
		let done = this.async();

		const waitForDelete = function (url, callback) {
			let boundcb = callback.bind({ url: url });

			++pending_tasks;
			let r = request.del(url, function (error, response, body) {
				boundcb(error, response, body);
				--pending_tasks;
			}).auth(userid, passwd, true);

			return r;
		}

		grunt.verbose.writeln("========================= delete References ===========================");

		// Build reference list
		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			refs = grunt.file.expand(opts, f);
		}

		url = url + "/v1/organizations/" + org + "/environments/" + env + "/references";

		// Delete references
		refs.forEach(function (refPath) {
			let refName = path.basename(refPath);

			let del_url = url + "/" + refName;
			waitForDelete(del_url, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;

				if (!error && status == 200) {
					grunt.verbose.writeln('Resp [' + status + '] for reference deletion ' + this.url + ' -> ' + body);
					grunt.verbose.writeln('Deleted reference ' + refName);
				}
				else {
					grunt.log.error('ERROR Resp [' + status + '] for reference deletion ' + this.url + ' -> ' + body);
					if (error) {
						grunt.log.error(error);
					}
				}
			});
		});

		// Set a 1s timer to wait for pending requests to complete
		let intervalId = setInterval(function () {
			if (pending_tasks <= 0) {
				if (refs.length <= 0) {
					grunt.verbose.writeln("No References");
				}
				else {
					grunt.log.ok('Deleted ' + refs.length + ' references');
				}
				grunt.verbose.writeln("================== delete references DONE()");

				clearInterval(intervalId);
				done();
			}
			else {
				grunt.verbose.writeln('Waiting for ' + pending_tasks + ' pending requests');
			}
		}, 1000);
	});
};
