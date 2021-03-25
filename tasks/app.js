/*jslint node: true */
'use strict';

const path = require('path');
const apigee = require('../config.js');
const asyncrequest = require('../util/asyncrequest.lib.js');


module.exports = function (grunt) {
	grunt.registerTask('exportApps', 'Export all apps from org ' + apigee.from.org + " [" + apigee.from.version + "]", function () {
		let url = apigee.from.url;
		let org = apigee.from.org;
		let userid = apigee.from.userid;
		let passwd = apigee.from.passwd;
		let filepath = grunt.config.get("exportApps.dest.data");
		let dev_count = 0;
		let company_count = 0;
		let total_apps = 0;
		let done = this.async();

		const { waitForGet, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		grunt.verbose.writeln("========================= export Apps ===========================");

		const developers_url = url + "/v1/organizations/" + org + "/developers";
		const companies_url = url + "/v1/organizations/" + org + "/companies";

		const dumpDeveloperApps = function (email) {
			let dev_url = developers_url + "/" + encodeURIComponent(email);

			// Retrieve developer details
			waitForGet(dev_url, function (dev_error, dev_response, dev_body) {
				if (!dev_error && dev_response.statusCode == 200) {
					let dev_detail = JSON.parse(dev_body);
					let dev_folder = path.join(filepath, "developers", dev_detail.email);
					grunt.file.mkdir(dev_folder);

					//Get developer Apps
					let apps_url = developers_url + "/" + encodeURIComponent(dev_detail.email) + "/apps?expand=true";
					grunt.verbose.writeln(apps_url);

					waitForGet(apps_url, function (app_error, app_response, app_body) {
						if (!app_error && app_response.statusCode == 200) {
							let apps_detail = JSON.parse(app_body);
							let apps = apps_detail.app;

							if (apps) {
								for (let j = 0; j < apps.length; j++) {
									let app = apps[j];
									let file_name = path.join(dev_folder, app.name);

									grunt.file.write(file_name, JSON.stringify(app));
									grunt.verbose.writeln('App ' + dev_detail.email + ' / ' + app.name + ' written!');
								};
							}
							total_apps += apps.length;

							if (apps.length > 0) {
								grunt.log.ok('Retrieved ' + apps.length + ' apps for ' + dev_detail.email);
							}
							else {
								grunt.verbose.writeln('Retrieved ' + apps.length + ' apps for ' + dev_detail.email);
							}
						}
						else {
							grunt.log.error('Error retrieving apps for developer ' + dev_detail.email);

							if (error) {
								grunt.log.error(error);
							}
						}
					});
				}
				else {
					if (dev_error)
						grunt.log.error(dev_error);
					else
						grunt.log.error(dev_body);
				}
			});
			// End Developer details
		}

		const iterateOverDevs = function (start, base_url, callback) {
			let url = base_url;

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
						return;
						// detect the only developer returned is the one we asked to start with; that's the end game, but wait.
					} else if ((devs.length == 1) && (devs[0] == start)) {
						grunt.log.ok('Retrieved TOTAL of ' + dev_count + ' developers, waiting for callbacks to complete');
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
						iterateOverDevs(last, base_url, callback);
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

		const dumpCompanyApps = function (company) {
			let company_url = companies_url + '/' + encodeURIComponent(company);

			// Retrieve company details
			waitForGet(company_url, function (company_error, company_response, company_body) {
				if (!company_error && company_response.statusCode == 200) {
					let company_detail = JSON.parse(company_body);
					let company_folder = path.join(filepath, "companies", company_detail.name);
					grunt.file.mkdir(company_folder);

					//Get company Apps
					let apps_url = companies_url + "/" + encodeURIComponent(company_detail.name) + "/apps?expand=true";
					grunt.verbose.writeln(apps_url);

					waitForGet(apps_url, function (app_error, app_response, app_body) {
						if (!app_error && app_response.statusCode == 200) {
							let apps_detail = JSON.parse(app_body);
							let apps = apps_detail.app;

							if (apps) {
								for (let j = 0; j < apps.length; j++) {
									let app = apps[j];
									let file_name = path.join(company_folder, app.name);

									grunt.file.write(file_name, JSON.stringify(app));
									grunt.verbose.writeln('App ' + company_detail.name + ' / ' + app.name + ' written!');
								};
							}
							total_apps += apps.length;

							if (apps.length > 0) {
								grunt.log.ok('Retrieved ' + apps.length + ' apps for ' + company_detail.name);
							}
							else {
								grunt.verbose.writeln('Retrieved ' + apps.length + ' apps for ' + company_detail.name);
							}

						}
						else {
							grunt.log.error('Error retrieving apps for company ' + company_detail.name);

							if (error) {
								grunt.log.error(error);
							}
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

		const iterateOverCompanies = function (start, base_url, callback) {
			let url = base_url;

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
						return;
						// if the only company returned is the one we asked to start with; that's the end game, but wait.
					} else if ((companies.length == 1) && (companies[0] == start)) {
						grunt.log.ok('Retrieved TOTAL of ' + company_count + ' companies, waiting for callbacks to complete');
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
						iterateOverCompanies(last, base_url, callback);
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

		iterateOverDevs(null, developers_url, dumpDeveloperApps);

		iterateOverCompanies(null, companies_url, dumpCompanyApps);

		waitForCompletion(function () {
			if (total_apps <= 0) {
				grunt.verbose.writeln("No Apps");
			}
			else {
				grunt.log.ok('Exported ' + total_apps + ' apps for ' + dev_count + ' developers and ' + company_count + ' companies');
			}
			grunt.verbose.writeln("================== export apps DONE()");

			done();
		});
	});

	grunt.registerMultiTask('importApps', 'Import all apps to org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let files;
		let done = this.async();

		const { waitForPost, waitForDelete, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		let f = grunt.option('src');
		if (f) {
			let opts = {
				flatten: false
			};

			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts, f);
		} else {
			files = this.filesSrc;
		}

		const developers_url = url + "/v1/organizations/" + org + "/developers";
		const companies_url = url + "/v1/organizations/" + org + "/companies";

		files.forEach(function (filepath) {
			let folders = filepath.split("/");
			let apptype = folders[folders.length - 3];
			let owner = folders[folders.length - 2];
			let app_count = 0;
			let app_url;

			switch (apptype) {
				case "developers":
					app_url = developers_url + "/" + owner + "/apps";
					break;

				case "companies":
					app_url = companies_url + "/" + owner + "/apps";
					break;

				default:
					return;
			}

			let content = grunt.file.read(filepath);
			let app = JSON.parse(content);

			grunt.verbose.writeln("Creating app : " + app.name + " under developer " + owner);

			delete app['appId'];
			//delete app['status'];
			delete app['developerId'];
			delete app['lastModifiedAt'];
			delete app['lastModifiedBy'];
			delete app['createdAt'];
			delete app['createdBy'];
			//delete app['status'];
			delete app['appFamily'];
			delete app['accessType'];
			delete app['credentials'];

			grunt.verbose.writeln("Creating App " + app_url);
			grunt.verbose.writeln(JSON.stringify(app));

			waitForPost(app_url, {
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(app)
			},
				function (error, response, body) {
					try {
						let cstatus = 999;
						if (response)
							cstatus = response.statusCode;
						if (cstatus == 200 || cstatus == 201) {
							++app_count;
							grunt.verbose.writeln('Resp [' + response.statusCode + '] for create app  ' + this.url + ' -> ' + body);
							let app_resp = JSON.parse(body);

							// Set app status
							if (app['status'] && (app_resp['status'] != app['status'])) {
								let status_url = app_url + '/' + app.name + '?action=';
								if (app['status'] == 'approved')
									status_url += "approve";
								else
									status_url += "revoke";

								waitForPost(status_url, {}, function (error, response, body) {
									let status = 999;
									if (response) {
										status = response.statusCode;
									}

									if (!error && status == 204) {
										grunt.verbose.writeln('Resp [' + status + '] for app status ' + this.owner + ' - ' + this.app_name + ' - ' + this.url + ' -> ' + body);
									}
									else {
										grunt.log.error('ERROR Resp [' + status + '] for ' + this.owner + ' - ' + this.app_name + ' - ' + this.url + ' -> ' + body);

										if (error) {
											grunt.log.error(error);
										}
									}
								}.bind({ owner: owner, app_name: app.name }));
							}

							// Delete the key generated when App is created
							let client_key = app_resp.credentials[0].consumerKey;
							let delete_url = app_url + '/' + app.name + '/keys/' + client_key;

							waitForDelete(delete_url, function (error, response, body) {
								let status = 999;
								if (response)
									status = response.statusCode;

								if (!error && status == 200) {
									grunt.verbose.writeln('Resp [' + status + '] for key delete ' + this.url + ' -> ' + body);
								}
								else {
									grunt.log.error('ERROR Resp [' + status + '] for key delete ' + this.url + ' -> ' + body);
								}
							}).auth(userid, passwd, true);
						}
						else {
							grunt.verbose.writeln('ERROR Resp [' + response.statusCode + '] for create app  ' + this.app_url + ' -> ' + body);
							callback();
						}
					} catch (err) {
						grunt.log.error("ERROR - from App URL : " + app_url);
						grunt.log.error(body);
						grunt.log.error(err);
					}
				}
			);
		});

		waitForCompletion(function () {
			if (total_apps <= 0) {
				grunt.verbose.writeln("No Apps");
			}
			else {
				grunt.log.ok('Imported ' + app_count + ' apps');
			}

			done();
		});
	});


	grunt.registerMultiTask('deleteApps', 'Delete all apps from org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let files;
		let del_count = 0;
		let done = this.async();

		const { waitForDelete, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts, f);
		}
		else {
			files = this.filesSrc;
		}

		const developers_url = url + "/v1/organizations/" + org + "/developers";
		const companies_url = url + "/v1/organizations/" + org + "/companies";

		files.forEach(function (filepath) {
			grunt.verbose.writeln("processing file " + filepath);
			let folders = filepath.split("/");
			let apptype = folders[folders.length - 3];
			let owner = folders[folders.length - 2];
			let app_del_url;

			switch (apptype) {
				case 'developers':
					app_del_url = developers_url + "/" + owner + "/apps/" + folders[folders.length - 1];
					break;

				case 'companies':
					app_del_url = companies_url + "/" + owner + "/apps/" + folders[folders.length - 1];
					break;

				default:
					return;
			}

			let content = grunt.file.read(filepath);
			let app = JSON.parse(content);

			grunt.verbose.writeln('Deleting app: ' + app_del_url);
			waitForDelete(app_del_url, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;

				if (!error && status == 200) {
					grunt.verbose.writeln('Resp [' + status + '] for delete app ' + this.url + ' -> ' + body);
					++del_count;
				}
				else {
					grunt.log.error('ERROR Resp [' + status + '] for delete app ' + this.url + ' -> ' + body);
				}
			});
		});

		waitForCompletion(function () {
			if (files.length <= 0) {
				grunt.verbose.writeln("No Apps");
			}
			else {
				grunt.log.ok('Deleted ' + del_count + ' apps');
			}

			done();
		});
	});
};