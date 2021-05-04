/*jslint node: true */
'use strict';

const path = require('path');
const apigee = require('../config.js');
const asyncrequest = require('../util/asyncrequest.lib.js');
const iterators = require('../util/iterators.lib.js');
const apigeeOrg = require('../util/org.lib.js');
const apigeeCompany = require('../util/company.lib.js');

module.exports = function (grunt) {
	grunt.registerTask('exportApps', 'Export all apps from org ' + apigee.from.org + " [" + apigee.from.version + "]", function () {
		const done = this.async();

		const { useCompanyApps } = apigeeOrg(grunt, apigee.from);

		useCompanyApps(function (use_company_apps) {
			const url = apigee.from.url;
			const org = apigee.from.org;
			const userid = apigee.from.userid;
			const passwd = apigee.from.passwd;
			const filepath = grunt.config.get("exportApps.dest.data");
			let dev_count = 0;
			let company_count = 0;
			let total_apps = 0;

			const { iterateOverDevs, iterateOverCompanies } = iterators(grunt, apigee);
			const { waitForGet, waitForCompletion } = asyncrequest(grunt, userid, passwd);

			grunt.verbose.writeln("========================= export Apps ===========================");

			const developers_url = url + "/v1/organizations/" + org + "/developers";
			const companies_url = url + "/v1/organizations/" + org + "/companies";

			const dumpDeveloperApps = function (email) {
				let dev_url = developers_url + "/" + encodeURIComponent(email);

				// Retrieve developer details
				waitForGet(dev_url, function (dev_error, dev_response, dev_body) {
					if (!dev_error && dev_response.statusCode == 200) {
						++dev_count;

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

								if (app_error) {
									grunt.log.error(app_error);
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

			const dumpCompanyApps = function (company) {
				let company_url = companies_url + '/' + encodeURIComponent(company);

				// Retrieve company details
				waitForGet(company_url, function (company_error, company_response, company_body) {
					if (!company_error && company_response.statusCode == 200) {
						++company_count;

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

								if (app_error) {
									grunt.log.error(app_error);
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

			iterateOverDevs(dumpDeveloperApps);

			if (use_company_apps) {
				iterateOverCompanies(dumpCompanyApps);
			}
			else {
				grunt.log.writeln(`Source org does not support company apps - skipping company app export`);
			}

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
	});

	grunt.registerMultiTask('importApps', 'Import all apps to org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let files = this.filesSrc;
		const companies_folder = path.dirname(grunt.config.get("importCompanies.src.data"));
		const force_update = grunt.option("force-update");
		const done = this.async();

		const { useCompanyApps } = apigeeOrg(grunt, apigee.to);

		useCompanyApps(function (use_company_apps) {
			const url = apigee.to.url;
			const org = apigee.to.org;
			const userid = apigee.to.userid;
			const passwd = apigee.to.passwd;
			let app_count = 0;
			let app_create_count = 0;
			let app_update_count = 0;
			let app_err_count = 0;
			let status_err_count = 0;
			let key_err_count = 0;

			const { waitForGet, waitForPost, waitForPut, waitForDelete, waitForCompletion } = asyncrequest(grunt, userid, passwd);
			const { mapCompanyToDeveloper } = apigeeCompany(grunt, companies_folder);

			let f = grunt.option('src');
			if (f) {
				let opts = {
					flatten: false
				};

				grunt.verbose.writeln('src pattern = ' + f);
				files = grunt.file.expand(opts, f);
			}

			if (!use_company_apps) {
				grunt.log.writeln("Target org does not support company apps; converting company apps to developer apps");
			}

			const developers_url = url + "/v1/organizations/" + org + "/developers";
			const companies_url = url + "/v1/organizations/" + org + "/companies";

			files.forEach(function (filepath) {
				const folders = filepath.split("/");
				const apptype = folders[folders.length - 3];
				let owner = folders[folders.length - 2];
				let ownertype;
				let apps_url;

				switch (apptype) {
					case "developers":
						apps_url = developers_url + "/" + encodeURIComponent(owner) + "/apps";
						ownertype = "developer";
						break;

					case "companies":
						if (use_company_apps) {
							apps_url = companies_url + "/" + encodeURIComponent(owner) + "/apps";
							ownertype = "company";
						}
						else {
							let dev_email = mapCompanyToDeveloper(owner);
							if (dev_email) {
								apps_url = developers_url + "/" + encodeURIComponent(dev_email) + "/apps";
								ownertype = "developer";
								owner = dev_email;
							}
							else {
								++app_err_count;
								grunt.log.error(`No developers for company ${owner}`);
								return;
							}
						}
						break;

					default:
						return;
				}

				const content = grunt.file.read(filepath);
				let app = JSON.parse(content);
				++app_count;

				// Check if the app already exists
				let app_url = apps_url + "/" + encodeURIComponent(app.name);
				waitForGet(app_url, function (error, response, body) {
					let xstatus = 999;
					if (response)
						xstatus = response.statusCode;

					if (!error && (xstatus == 200)) {
						// App already exists
						let existingApp = JSON.parse(body);

						// Is the import file newer than the instance in Apigee?
						const update_required = existingApp.lastModifiedAt && (existingApp.lastModifiedAt < app.lastModifiedAt);

						if (update_required || force_update) {
							if (update_required) {
								grunt.verbose.writeln(`Updating app: ${this.app_name} under ${this.ownertype} ${this.owner}`);
							} else {
								grunt.verbose.writeln(`Forcibly updating app: ${this.app_name} under ${this.ownertype} ${this.owner}`);
							}

							let updateApp = { ...app };
							delete updateApp['lastModifiedAt'];
							delete updateApp['lastModifiedBy'];

							waitForPut(app_url, {
								headers: {
									'Content-Type': 'application/json'
								},
								body: JSON.stringify(updateApp)
							}, function (error, response, body) {
								let ustatus = 999;
								if (response)
									ustatus = response.statusCode;

								if (!error && (ustatus == 200 || ustatus == 201)) {
									++app_update_count;
									grunt.verbose.writeln('Resp [' + response.statusCode + '] for update app  ' + this.url + ' -> ' + body);
								} else {
									++app_err_count;

									if (error) {
										grunt.log.error(error);
									}
									if (response) {
										grunt.verbose.writeln('ERROR Resp [' + response.statusCode + '] for update app  ' + this.url + ' -> ' + body);
									}
								}
							}.bind({ url: app_url }));
						} else {
							grunt.verbose.writeln(`App: ${this.app_name} under ${this.ownertype} ${this.owner} is up to date`);
						}
					} else if (xstatus == 404) {
						// App does not exist
						grunt.verbose.writeln(`Creating app: ${this.app_name} under ${this.ownertype} ${this.owner}`);

						let createApp = { ...app };
						delete createApp['lastModifiedAt'];
						delete createApp['lastModifiedBy'];
						delete createApp['appId'];
						delete createApp['developerId'];
						delete createApp['createdAt'];
						delete createApp['createdBy'];
						delete createApp['appFamily'];
						delete createApp['accessType'];
						delete createApp['credentials'];

						grunt.verbose.writeln("Creating App " + apps_url);
						grunt.verbose.writeln(JSON.stringify(createApp));

						waitForPost(apps_url, {
							headers: {
								'Content-Type': 'application/json'
							},
							body: JSON.stringify(createApp)
						},
							function (error, response, body) {
								try {
									let cstatus = 999;
									if (response)
										cstatus = response.statusCode;

									if (!error && (cstatus == 200 || cstatus == 201)) {
										++app_create_count;
										grunt.verbose.writeln('Resp [' + response.statusCode + '] for create app  ' + this.url + ' -> ' + body);
										let app_resp = JSON.parse(body);

										// Set app status
										if (createApp['status'] && (app_resp['status'] != createApp['status'])) {
											let status_url = apps_url + '/' + encodeURIComponent(createApp.name) + '?action=';
											if (createApp['status'] == 'approved')
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
													++status_err_count;
													grunt.log.error('ERROR Resp [' + status + '] for ' + this.owner + ' - ' + this.app_name + ' - ' + this.url + ' -> ' + body);

													if (error) {
														grunt.log.error(error);
													}
												}
											}.bind({ url: status_url, owner: owner, app_name: createApp.name }));
										}

										// Delete the key generated when App is created
										const client_key = app_resp.credentials[0].consumerKey;
										const delete_url = apps_url + '/' + encodeURIComponent(createApp.name) + '/keys/' + client_key;

										waitForDelete(delete_url, function (error, response, body) {
											let status = 999;
											if (response)
												status = response.statusCode;

											if (!error && status == 200) {
												grunt.verbose.writeln('Resp [' + status + '] for key delete ' + this.url + ' -> ' + body);
											}
											else {
												++key_err_count;
												grunt.log.error('ERROR Resp [' + status + '] for key delete ' + this.url + ' -> ' + body);

												if (error) {
													grunt.log.error(error);
												}
											}
										}.bind({ url: delete_url }));
									} else {
										++app_err_count;

										if (error) {
											grunt.log.error(error);
										}
										if (response) {
											grunt.verbose.writeln('ERROR Resp [' + response.statusCode + '] for create app  ' + this.url + ' -> ' + body);
										}
									}
								} catch (err) {
									grunt.log.error("ERROR - from App URL : " + apps_url);
									if (body) {
										grunt.log.error(body);
									}
									grunt.log.error(err);
								}
							}.bind({ url: apps_url })
						);
					} else {
						// Unexpected status checking for app existence
						++app_err_count;

						grunt.log.error('ERROR Resp [' + xstatus + '] for ' + this.owner + ' - ' + this.app_name + ' - ' + this.url + ' -> ' + body);
						if (error) {
							grunt.log.error(error);
						}
					}
				}.bind({ url: app_url, owner: owner, ownertype: ownertype, app_name: app.name }));
			});

			waitForCompletion(function () {
				if (app_count) {
					grunt.log.ok('Processed ' + app_count + ' apps');
				} else {
					grunt.log.ok('No apps found');
				}
				if (app_create_count) {
					grunt.log.ok('Created ' + app_create_count + ' apps');
				}
				if (app_update_count) {
					grunt.log.ok('Updated ' + app_update_count + ' apps');
				}
				if (app_err_count) {
					grunt.log.error('Failed to create/update ' + app_err_count + ' apps');
				}
				if (status_err_count) {
					grunt.log.error('Failed to set status for ' + status_err_count + ' apps');
				}
				if (key_err_count) {
					grunt.log.error('Failed to delete default key for ' + key_err_count + ' apps');
				}

				done();
			});
		});
	});


	grunt.registerMultiTask('deleteApps', 'Delete all apps from org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let files = this.filesSrc;
		const companies_folder = path.dirname(grunt.config.get("deleteCompanies.src.data"));
		const done = this.async();

		const { useCompanyApps } = apigeeOrg(grunt, apigee.to);

		useCompanyApps(function (use_company_apps) {
			const url = apigee.to.url;
			const org = apigee.to.org;
			const userid = apigee.to.userid;
			const passwd = apigee.to.passwd;
			let del_count = 0;
			let del_err_count = 0;

			const { waitForDelete, waitForCompletion } = asyncrequest(grunt, userid, passwd);
			const { mapCompanyToDeveloper } = apigeeCompany(grunt, companies_folder);

			let f = grunt.option('src');
			if (f) {
				let opts = { flatten: false };

				grunt.verbose.writeln('src pattern = ' + f);
				files = grunt.file.expand(opts, f);
			}

			if (!use_company_apps) {
				grunt.log.writeln("Target org does not support company apps; converting company apps to developer apps");
			}

			const developers_url = url + "/v1/organizations/" + org + "/developers";
			const companies_url = url + "/v1/organizations/" + org + "/companies";

			files.forEach(function (filepath) {
				grunt.verbose.writeln("processing file " + filepath);
				const folders = filepath.split("/");
				const apptype = folders[folders.length - 3];
				let owner = folders[folders.length - 2];
				const app_name = folders[folders.length - 1];
				let app_del_url;

				switch (apptype) {
					case 'developers':
						app_del_url = developers_url + "/" + encodeURIComponent(owner) + "/apps/" + encodeURIComponent(app_name);
						break;

					case 'companies':
						if (use_company_apps) {
							app_del_url = companies_url + "/" + encodeURIComponent(owner) + "/apps/" + encodeURIComponent(app_name);
						}
						else {
							let dev_email = mapCompanyToDeveloper(owner);
							if (dev_email) {
								owner = dev_email;
								app_del_url = developers_url + "/" + encodeURIComponent(owner) + "/apps/" + encodeURIComponent(app_name);
							}
							else {
								++del_err_count;
								grunt.log.error(`No developers for company ${owner}`);
								return;
							}
						}
						break;

					default:
						return;
				}

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
						++del_err_count;
					}
				}.bind({ url: app_del_url }));
			});

			waitForCompletion(function () {
				if (files.length <= 0) {
					grunt.verbose.writeln("No Apps");
				}
				if (del_count) {
					grunt.log.ok('Deleted ' + del_count + ' apps');
				}
				if (del_err_count) {
					grunt.log.error('Failed to delete ' + del_err_count + ' apps');
				}

				done();
			});
		});
	});
};