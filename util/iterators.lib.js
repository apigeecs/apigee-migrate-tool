'use strict';

const asyncrequest = require('./asyncrequest.lib.js');

module.exports = function (grunt, apigee) {
	let url = apigee.from.url;
	let org = apigee.from.org;
	let userid = apigee.from.userid;
	let passwd = apigee.from.passwd;
	let dev_count = 0;
	let company_count = 0;

	const { waitForGet, waitForCompletion } = asyncrequest(grunt, userid, passwd);

	const developers_url = url + "/v1/organizations/" + org + "/developers";
	const companies_url = url + "/v1/organizations/" + org + "/companies";

	const iterateOverDevs = function (callback, start = null) {
		let url = developers_url;

		if (start) {
			url += "?startKey=" + encodeURIComponent(start);
		}

		grunt.verbose.writeln("getting developers: " + url);
		waitForGet(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				let devs = JSON.parse(body);
				let last = null;

				// detect none and we're done
				if (devs.length == 0) {
					grunt.log.ok('No developers found');
					// detect the only developer returned is the one we asked to start with; that's the end game, but wait.
				} else if ((devs.length == 1) && (devs[0] == start)) {
					grunt.log.ok('Retrieved TOTAL of ' + dev_count + ' developers, waiting for callbacks to complete');
					waitForCompletion();
				} else {
					dev_count += devs.length;
					if (start)
						dev_count--;

					for (let i = 0; i < devs.length; i++) {
						// If there was a 'start', don't do it again, because it was processed in the previous callback.
						if (start && devs[i] == start) {
							continue;
						}

						if (callback) {
							callback(devs[i]);
						}

						last = devs[i];
					}

					grunt.log.ok('Retrieved ' + devs.length + ' developers');

					// Keep on calling getDevs() as long as we're getting new developers back
					iterateOverDevs(callback, last);
				}
			}
			else {
				if (error)
					grunt.log.error(error);
				else
					grunt.log.error(body);
			}
		});
	}

	const iterateOverCompanies = function (callback, start = null) {
		let url = companies_url;

		if (start) {
			url += "?startKey=" + encodeURIComponent(start);
		}

		grunt.verbose.writeln("getting companies: " + url);
		waitForGet(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				let companies = JSON.parse(body);
				let last = null;

				// detect none and we're done
				if (companies.length == 0) {
					grunt.log.ok('No companies found');
					// if the only company returned is the one we asked to start with; that's the end game, but wait.
				} else if ((companies.length == 1) && (companies[0] == start)) {
					grunt.log.ok('Retrieved TOTAL of ' + company_count + ' companies, waiting for callbacks to complete');
					waitForCompletion();
				} else {
					company_count += companies.length;
					if (start)
						company_count--;

					for (let i = 0; i < companies.length; i++) {
						// If there was a 'start', don't do it again, because it was processed in the previous callback.
						if (start && companies[i] == start) {
							continue;
						}

						if (callback) {
							callback(companies[i]);
						}

						last = companies[i];
					}

					grunt.log.ok('Retrieved ' + companies.length + ' companies');

					// Keep on calling getCompanies() as long as we're getting new companies back
					iterateOverCompanies(callback, last);
				}
			}
			else {
				if (error)
					grunt.log.error(error);
				else
					grunt.log.error(body);
			}
		});
	}

	return { iterateOverDevs, iterateOverCompanies };
}