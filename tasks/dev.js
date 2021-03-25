/*jslint node: true */
'use strict';

const path = require('path');
const apigee = require('../config.js');
const asyncrequest = require('../util/asyncrequest.lib.js');
const iterators = require('../util/iterators.lib.js');

module.exports = function (grunt) {
	grunt.registerTask('exportDevs', 'Export all developers from org ' + apigee.from.org + " [" + apigee.from.version + "]", function () {
		let url = apigee.from.url;
		let org = apigee.from.org;
		let userid = apigee.from.userid;
		let passwd = apigee.from.passwd;
		let filepath = grunt.config.get("exportDevs.dest.data");
		let dev_count = 0;
		let done = this.async();

		const { iterateOverDevs } = iterators(grunt, apigee);
		const { waitForGet, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		grunt.verbose.writeln("========================= export Devs ===========================");

		const developers_url = url + "/v1/organizations/" + org + "/developers";

		const dumpDeveloper = function (email) {
			const dev_url = developers_url + "/" + encodeURIComponent(email);
			grunt.verbose.writeln("getting developer: " + dev_url);

			// Retrieve developer details
			waitForGet(dev_url, function (dev_error, dev_response, dev_body) {
				if (!dev_error && dev_response.statusCode == 200) {
					++dev_count;

					grunt.verbose.writeln(dev_body);
					let dev_detail = JSON.parse(dev_body);

					let dev_file = path.join(filepath, dev_detail.email);
					grunt.file.write(dev_file, dev_body);
					grunt.verbose.writeln('Dev ' + dev_detail.email + ' written!');
				}
				else {
					if (dev_error)
						grunt.log.error(dev_error);
					else
						grunt.log.error(dev_body);
				}
			});
		}

		// get All developers
		iterateOverDevs(dumpDeveloper);

		waitForCompletion(function () {
			if (dev_count <= 0) {
				grunt.verbose.writeln("No developers");
			}
			else {
				grunt.log.ok('Exported ' + dev_count + ' developers');
			}
			grunt.verbose.writeln("================== export Devs DONE()");

			done();
		});
	});


	grunt.registerMultiTask('importDevs', 'Import all developers to org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let files = this.filesSrc;
		let dev_count = 0;
		let done = this.async();

		const { waitForPost, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts, f);
		}

		const developers_url = url + "/v1/organizations/" + org + "/developers";

		files.forEach(function (filepath) {
			let content = grunt.file.read(filepath);

			waitForPost(developers_url, {
				headers: { 'Content-Type': 'application/json' },
				body: content
			}, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;

				if (!error && status == 201) {
					grunt.verbose.writeln('Resp [' + status + '] for dev creation ' + this.url + ' -> ' + body);
					++dev_count;
				}
				else {
					if (error) {
						grunt.log.error(error);
					}

					grunt.verbose.error('ERROR Resp [' + status + '] for dev creation ' + this.url + ' -> ' + body);
				}
			});
		});

		waitForCompletion(function () {
			grunt.log.ok('Imported ' + dev_count + ' developers');
			done();
		});
	});

	grunt.registerMultiTask('deleteDevs', 'Delete all developers from org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let files = this.filesSrc;
		let dev_count = 0;
		let done = this.async();

		const { waitForDelete, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts, f);
		}

		const developers_url = url + "/v1/organizations/" + org + "/developers";

		files.forEach(function (filepath) {
			let content = grunt.file.read(filepath);
			let dev = JSON.parse(content);

			const del_url = developers_url + "/" + encodeURIComponent(dev.email);
			grunt.verbose.writeln(del_url);

			waitForDelete(del_url, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;

				if (!error && status == 200) {
					grunt.verbose.writeln('Resp [' + status + '] for dev deletion ' + this.url + ' -> ' + body);
					++dev_count;
				}
				else {
					if (error) {
						grunt.log.error(error);
					}

					grunt.verbose.error('ERROR Resp [' + status + '] for dev deletion ' + this.url + ' -> ' + body);
				}
			});

			waitForCompletion(function () {
				grunt.log.ok('Deleted ' + dev_count + ' developers');
				done();
			});
		});
	});
};
