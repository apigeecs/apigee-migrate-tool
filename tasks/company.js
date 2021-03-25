/*jslint node: true */
'use strict';

const path = require('path');
const apigee = require('../config.js');
const asyncrequest = require('../util/asyncrequest.lib.js');
const iterators = require('../util/iterators.lib.js');

module.exports = function (grunt) {
	grunt.registerTask('exportCompanies', 'Export all companies from org ' + apigee.from.org + " [" + apigee.from.version + "]", function () {
		let url = apigee.from.url;
		let org = apigee.from.org;
		let userid = apigee.from.userid;
		let passwd = apigee.from.passwd;
		let filepath = grunt.config.get("exportCompanies.dest.data");
		let company_count = 0;
		let done = this.async();

		const { iterateOverCompanies } = iterators(grunt, apigee);
		const { waitForGet, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		grunt.verbose.writeln("========================= export Companies ===========================");

		const companies_url = url + "/v1/organizations/" + org + "/companies";

		const dumpCompany = function (company) {
			const company_url = companies_url + "/" + encodeURIComponent(company);
			grunt.verbose.writeln("getting company: " + company_url);

			// Retrieve company details
			waitForGet(company_url, function (company_error, company_response, company_body) {
				if (!company_error && company_response.statusCode == 200) {
					++company_count;

					grunt.verbose.writeln(company_body);
					let company_detail = JSON.parse(company_body);

					let company_file = path.join(filepath, company_detail.name);
					grunt.file.write(company_file, company_body);
					grunt.verbose.writeln('Company ' + company_detail.name + ' written!');
				}
				else {
					if (company_error)
						grunt.log.error(company_error);
					else
						grunt.log.error(company_body);
				}
			});
		}

		// get All developers
		iterateOverCompanies(dumpCompany);

		waitForCompletion(function () {
			if (company_count <= 0) {
				grunt.verbose.writeln("No companies");
			}
			else {
				grunt.log.ok('Exported ' + company_count + ' companies');
			}
			grunt.verbose.writeln("================== export Companies DONE()");

			done();
		});
	});


	grunt.registerMultiTask('importCompanies', 'Import all companies to org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let files = this.filesSrc;
		let company_count = 0;
		let done = this.async();

		const { waitForPost, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts, f);
		}

		const companies_url = url + "/v1/organizations/" + org + "/companies";

		files.forEach(function (filepath) {
			let content = grunt.file.read(filepath);

			waitForPost(companies_url, {
				headers: { 'Content-Type': 'application/json' },
				body: content
			}, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;

				if (!error && status == 201) {
					grunt.verbose.writeln('Resp [' + status + '] for company creation ' + this.url + ' -> ' + body);
					++company_count;
				}
				else {
					if (error) {
						grunt.log.error(error);
					}

					grunt.verbose.error('ERROR Resp [' + status + '] for company creation ' + this.url + ' -> ' + body);
				}
			});
		});

		waitForCompletion(function () {
			grunt.log.ok('Imported ' + company_count + ' companies');
			done();
		});
	});

	grunt.registerMultiTask('deleteCompanies', 'Delete all companies from org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let files = this.filesSrc;
		let company_count = 0;
		let done = this.async();

		const { waitForDelete, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts, f);
		}

		const companies_url = url + "/v1/organizations/" + org + "/companies";

		files.forEach(function (filepath) {
			let content = grunt.file.read(filepath);
			let company_detail = JSON.parse(content);

			const del_url = companies_url + "/" + encodeURIComponent(company_detail.name);
			grunt.verbose.writeln(del_url);

			waitForDelete(del_url, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;

				if (!error && status == 200) {
					grunt.verbose.writeln('Resp [' + status + '] for dev deletion ' + this.url + ' -> ' + body);
					++company_count;
				}
				else {
					if (error) {
						grunt.log.error(error);
					}

					grunt.verbose.error('ERROR Resp [' + status + '] for dev deletion ' + this.url + ' -> ' + body);
				}
			});

			waitForCompletion(function () {
				grunt.log.ok('Deleted ' + company_count + ' companies');
				done();
			});
		});
	});
};
