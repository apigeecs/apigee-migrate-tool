/*jslint node: true */
'use strict';

const path = require('path');
const apigee = require('../config.js');
const asyncrequest = require('../util/asyncrequest.lib.js');
const iterators = require('../util/iterators.lib.js');
const apigeeOrg = require('../util/org.lib.js');

const company_lastname = "ConvertedCompany";

module.exports = function (grunt) {
	grunt.registerTask('exportCompanies', 'Export all companies from org ' + apigee.from.org + " [" + apigee.from.version + "]", function () {
		const url = apigee.from.url;
		const org = apigee.from.org;
		const userid = apigee.from.userid;
		const passwd = apigee.from.passwd;
		const filepath = grunt.config.get("exportCompanies.dest.data");
		let company_count = 0;
		const done = this.async();

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
					const company_detail = JSON.parse(company_body);

					const company_folder = path.join(filepath, company_detail.name);
					grunt.file.mkdir(company_folder);

					const company_file = path.join(company_folder, "company");
					grunt.file.write(company_file, company_body);

					const devs_url = company_url + "/developers";
					grunt.verbose.writeln("getting developers for company: " + devs_url);
					waitForGet(devs_url, function (devs_error, devs_response, devs_body) {
						if (!devs_error && devs_response.statusCode == 200) {
							const devs_file = path.join(company_folder, "developers");
							grunt.file.write(devs_file, devs_body);
						}
						else {
							if (devs_error)
								grunt.log.error(devs_error);
							else
								grunt.log.error(devs_body);
						}
					});
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
		let files = this.filesSrc;
		const done = this.async();

		const { useCompanyApps } = apigeeOrg(grunt, apigee.to);

		useCompanyApps(function (use_company_apps) {
			const url = apigee.to.url;
			const org = apigee.to.org;
			const userid = apigee.to.userid;
			const passwd = apigee.to.passwd;
			let company_count = 0;
			let company_err_count = 0;

			const { waitForPost, waitForCompletion } = asyncrequest(grunt, userid, passwd);

			let f = grunt.option('src');
			if (f) {
				let opts = { flatten: false };

				grunt.verbose.writeln('src pattern = ' + f);
				files = grunt.file.expand(opts, f);
			}

			if (use_company_apps) {
				const companies_url = url + "/v1/organizations/" + org + "/companies";

				files.forEach(function (filepath) {
					const company_file = path.join(filepath, "company");
					const content = grunt.file.read(company_file);

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
							++company_err_count;
							if (error) {
								grunt.log.error(error);
							}

							grunt.verbose.error('ERROR Resp [' + status + '] for company creation ' + this.url + ' -> ' + body);
						}
					}.bind({ url: companies_url }));
				});
			}
			else {
				grunt.log.writeln("Target org does not support company apps; converting companies to developers");
				const developers_url = url + "/v1/organizations/" + org + "/developers";

				files.forEach(function (filepath) {
					const company_file = path.join(filepath, "company");
					const devs_file = path.join(filepath, "developers");

					const company_details = grunt.file.readJSON(company_file);
					const company_devs = grunt.file.readJSON(devs_file);
					const company_name = company_details.name;

					if (company_devs && company_devs.developer && company_devs.developer.length > 0) {
						const dev_email = company_devs.developer[0].email;
						grunt.log.writeln(`Converting company ${company_name} to developer ${dev_email}`);

						let dev_details = {
							email: dev_email,
							username: dev_email,
							firstName: company_details.displayName,
							lastName: company_lastname,
							status: company_details.status,
							attributes: company_details.attributes
						};

						waitForPost(developers_url, {
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(dev_details)
						}, function (error, response, body) {
							let status = 999;
							if (response)
								status = response.statusCode;

							if (!error && status == 201) {
								grunt.verbose.writeln('Resp [' + status + '] for developer creation ' + this.url + ' -> ' + body);
								++company_count;
							}
							else {
								++company_err_count;
								if (error) {
									grunt.log.error(error);
								}

								grunt.verbose.error('ERROR Resp [' + status + '] for developer creation ' + this.url + ' -> ' + body);
							}
						}.bind({ url: developers_url }));
					}
					else {
						++company_err_count;
						grunt.log.error(`No developers for company ${company_name}`);
					}
				});
			}

			waitForCompletion(function () {
				if (company_count) {
					grunt.log.ok(`Imported ${company_count} companies`);
				}
				if (company_err_count) {
					grunt.log.error(`Failed to import ${company_err_count} companies`);
				}

				done();
			});
		});
	});

	grunt.registerMultiTask('deleteCompanies', 'Delete all companies from org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let files = this.filesSrc;
		const done = this.async();

		const { useCompanyApps } = apigeeOrg(grunt, apigee.to);

		useCompanyApps(function (use_company_apps) {
			const url = apigee.to.url;
			const org = apigee.to.org;
			const userid = apigee.to.userid;
			const passwd = apigee.to.passwd;
			let company_count = 0;
			let company_skip_count = 0;
			let company_err_count = 0;

			const { waitForGet, waitForDelete, waitForCompletion } = asyncrequest(grunt, userid, passwd);

			let f = grunt.option('src');
			if (f) {
				let opts = { flatten: false };

				grunt.verbose.writeln('src pattern = ' + f);
				files = grunt.file.expand(opts, f);
			}

			if (use_company_apps) {
				const companies_url = url + "/v1/organizations/" + org + "/companies";

				files.forEach(function (filepath) {
					const company_file = path.join(filepath, "company");
					const company_detail = grunt.file.readJSON(company_file);

					const del_url = companies_url + "/" + encodeURIComponent(company_detail.name);
					grunt.verbose.writeln(del_url);

					waitForDelete(del_url, function (error, response, body) {
						let status = 999;
						if (response)
							status = response.statusCode;

						if (!error && status == 200) {
							grunt.verbose.writeln('Resp [' + status + '] for company deletion ' + this.url + ' -> ' + body);
							++company_count;
						}
						else {
							++company_err_count;
							if (error) {
								grunt.log.error(error);
							}

							grunt.verbose.error('ERROR Resp [' + status + '] for company deletion ' + this.url + ' -> ' + body);
						}
					}.bind({ url: del_url }));
				});
			}
			else {
				grunt.log.writeln("Target org does not support company apps; deleting converted company developers");
				const developers_url = url + "/v1/organizations/" + org + "/developers";

				files.forEach(function (filepath) {
					const company_file = path.join(filepath, "company");
					const devs_file = path.join(filepath, "developers");

					const company_details = grunt.file.readJSON(company_file);
					const company_devs = grunt.file.readJSON(devs_file);
					const company_name = company_details.name;

					if (company_devs && company_devs.developer && company_devs.developer.length > 0) {
						const dev_email = company_devs.developer[0].email;
						grunt.verbose.writeln(`Looking for company ${company_name} as developer ${dev_email}`);

						const dev_url = developers_url + "/" + encodeURIComponent(dev_email);
						grunt.verbose.writeln(dev_url);

						// Check if this developer is actually a converted company
						waitForGet(dev_url, function (error, response, body) {
							let status = 999;
							if (response)
								status = response.statusCode;

							if (!error && status == 200) {
								const dev_detail = JSON.parse(body);

								if (dev_detail.lastName == company_lastname) {
									grunt.log.writeln(`Deleting company ${this.company_name} as developer ${this.dev_email}`);

									waitForDelete(this.url, function (error, response, body) {
										let dstatus = 999;
										if (response)
											dstatus = response.statusCode;

										if (!error && dstatus == 200) {
											grunt.verbose.writeln('Resp [' + dstatus + '] for company developer deletion ' + this.url + ' -> ' + body);
											++company_count;
										}
										else {
											++company_err_count;
											if (error) {
												grunt.log.error(error);
											}

											grunt.verbose.error('ERROR Resp [' + dstatus + '] for company developer deletion ' + this.url + ' -> ' + body);
										}
									}.bind({ url: this.url }));
								}
								else {
									++company_skip_count;
									grunt.verbose.writeln(`Developer ${this.dev_email} does not seem to be a converted company`);
								}
							}
						}.bind({ company_name: company_name, dev_email: dev_email, url: dev_url }));
					}
					else {
						++company_err_count;
						grunt.log.error(`No developers for company ${company_name}`);
					}
				});
			}

			waitForCompletion(function () {
				if (company_count) {
					grunt.log.ok(`Deleted ${company_count} company developers`);
				}
				if (company_skip_count) {
					grunt.log.ok(`Skipped ${company_skip_count} non-company developers`);
				}
				if (company_err_count) {
					grunt.log.error(`Failed to delete ${company_err_count} company developers`);
				}

				done();
			});
		});
	});
};
