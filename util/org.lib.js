'use strict';

const asyncrequest = require('./asyncrequest.lib.js');

module.exports = function (grunt, apigeeOrg) {
	const url = apigeeOrg.url;
	const org = apigeeOrg.org;
	const userid = apigeeOrg.userid;
	const passwd = apigeeOrg.passwd;
	const force_use_companies = grunt.option("use-companies");
	let org_details;

	const { waitForGet, waitForCompletion } = asyncrequest(grunt, userid, passwd);

	const getOrgDetails = function (callback) {
		if (org_details) {
			grunt.verbose.writeln(`Using cached org details for ${org}`);
			callback(org_details);
		}
		else {
			const org_url = url + "/v1/organizations/" + org;

			grunt.verbose.writeln(`Fetching org details for ${org}`);
			waitForGet(org_url, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;

				if (!error && status == 200) {
					grunt.verbose.writeln('Resp [' + status + '] for org ' + this.url + ' -> ' + body);
					org_details = JSON.parse(body);
				}
				else {
					org_details = null;
					grunt.verbose.error('ERROR Resp [' + status + '] for org ' + this.url + ' -> ' + body);
					if (error)
						grunt.log.error(error);
				}
			}.bind({ url: org_url }));

			waitForCompletion(function () {
				callback(org_details);
			});
		}
	}

	const getFeature = function (feature, callback) {
		const prop_name = "features." + feature;
		let found = false;

		getOrgDetails(function (org_data) {
			if (org_data && org_data.properties && org_data.properties.property) {
				for (let prop of org_data.properties.property) {
					if (prop.name == prop_name) {
						grunt.verbose.writeln(`Found feature ${feature}: ${prop.value}`);
						found = true;
						if (callback) {
							callback((prop.value == "true"));
						}

						break;
					}
				}
			}

			// If the feature was not found, tell the caller it is not enabled
			if (!found) {
				if (callback) {
					callback(false);
				}
			}
		});
	}

	const useCompanyApps = function (callback) {
		if (force_use_companies) {
			grunt.verbose.writeln("Company apps enabled by command-line option")
			callback(true);
		}
		else {
			getFeature("isMonetizationEnabled", callback);
		}
	}

	return { getFeature, useCompanyApps };
};