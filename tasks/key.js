/*jslint node: true */
'use strict';

const path = require('path');
const apigee = require('../config.js');
const asyncrequest = require('../util/asyncrequest.lib.js');
const apigeeOrg = require('../util/org.lib.js');
const apigeeCompany = require('../util/company.lib.js');

module.exports = function (grunt) {
	grunt.registerMultiTask('importKeys', 'Import all app keys to org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let files = this.filesSrc;
		const companies_folder = path.dirname(grunt.config.get("importCompanies.src.data"));
		const done = this.async();

		const { useCompanyApps } = apigeeOrg(grunt, apigee.to);

		useCompanyApps(function (use_company_apps) {
			const url = apigee.to.url;
			const org = apigee.to.org;
			const userid = apigee.to.userid;
			const passwd = apigee.to.passwd;
			let key_create_count = 0;
			let key_err_count = 0;
			let key_del_count = 0;
			let key_del_err_count = 0;
			let key_exists_count = 0;
			let prod_err_count = 0;
			let status_count = 0;
			let status_err_count = 0;

			const { waitForGet, waitForPost, waitForDelete, waitForCompletion } = asyncrequest(grunt, userid, passwd);
			const { mapCompanyToDeveloper } = apigeeCompany(grunt, companies_folder);

			const createAppKey = function (create_key_url, key_url, owner, appname, cKey, cSecret, products) {
				grunt.verbose.writeln(`Creating key ${owner} / ${appname} / ${cKey}`);
				const key_payload = "<CredentialRequest><ConsumerKey>" + cKey + "</ConsumerKey><ConsumerSecret>" + cSecret + "</ConsumerSecret><Attributes></Attributes></CredentialRequest>";

				waitForPost(create_key_url, {
					headers: { 'Content-Type': 'application/xml' },
					body: key_payload
				}, function (error, response, body) {
					let status = 999;
					if (response)
						status = response.statusCode;

					if (!error && status == 201) {
						++key_create_count;
						grunt.verbose.writeln('Resp [' + status + '] for ' + this.owner + ' - ' + this.url + ' -> ' + body);

						// Attach products to key
						let products_payload = {};
						let prods = [];
						for (let j = 0; j < this.products.length; j++) {
							prods.push(this.products[j].apiproduct);
						};
						products_payload['apiProducts'] = prods;

						if (prods.length > 0) {
							grunt.verbose.writeln('Attaching ' + prods.length + ' products to key ' + this.appname + ' / ' + this.cKey);

							waitForPost(this.key_url, {
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify(products_payload)
							}, function (error, response, body) {
								let status = 999;
								if (response)
									status = response.statusCode;

								if (!error && status == 200) {
									grunt.verbose.writeln('Resp [' + status + '] for ' + this.owner + ' - ' + this.appname + ' - ' + this.products_payload + ' - ' + this.cKey + ' product assignment -> ' + body);

									// Approve products for key
									for (let k = 0; k < this.products.length; k++) {
										setKeyProductStatus(this.key_url, this.products[k].apiproduct, this.products[k].status);
									}
								}
								else {
									// Failed to attach products to key
									++prod_err_count;
									grunt.verbose.error('ERROR Resp [' + status + '] for ' + this.owner + ' - ' + this.appname + ' - ' + this.products + ' - ' + this.cKey + ' product assignment -> ' + body);

									if (error) {
										grunt.verbose.error(error);
									}
								}
							}.bind({ url: this.key_url, owner: this.owner, cKey: this.cKey, appname: this.appname, products_payload: JSON.stringify(products_payload), key_url: this.key_url, products: this.products }));
						}
					}
					else {
						// Failed to create key
						++key_err_count;
						grunt.verbose.error('ERROR Resp [' + status + '] for ' + this.owner + ' - ' + this.url + ' -> ' + body);

						if (error) {
							grunt.verbose.error(error);
						}
					}
				}.bind({ url: create_key_url, owner: owner, appname: appname, cKey: cKey, products: products, key_url: key_url }));
			};

			const setKeyProductStatus = function (key_url, product, action = "approve") {
				let approve_key_url = key_url + "/apiproducts/" + encodeURIComponent(product) + "?action=";

				switch (action) {
					case "approve":
					case "approved":
						approve_key_url += "approve";
						grunt.verbose.writeln("Approving product for key - " + approve_key_url);
						break;

					case "revoke":
					case "revoked":
						approve_key_url += "revoke";
						grunt.verbose.writeln("Revoking product for key - " + approve_key_url);
						break;

					default:
						grunt.verbose.error(`Unknown action ${action} for key - ${approve_key_url}`);
						return;
				}

				waitForPost(approve_key_url, {
					headers: { 'Content-Type': 'application/octet-stream' }
				}, function (error, response, body) {
					let status = 999;
					if (response)
						status = response.statusCode;

					if (!error && status == 204) {
						++status_count;
						grunt.verbose.writeln('Resp [' + status + '] for ' + this.url + ' -> ' + body);
					}
					else {
						// Failed to approve product for key
						++status_err_count;
						grunt.verbose.error('ERROR Resp [' + status + '] for ' + this.url + ' -> ' + body);

						if (error) {
							grunt.verbose.error(error);
						}
					}
				}.bind({ url: approve_key_url }));
			};

			let f = grunt.option('src');
			if (f) {
				let opts = { flatten: false };

				grunt.verbose.writeln('src pattern = ' + f);
				files = grunt.file.expand(opts, f);
			}

			const developers_url = url + "/v1/organizations/" + org + "/developers";
			const companies_url = url + "/v1/organizations/" + org + "/companies";

			files.forEach(function (filepath) {
				const folders = filepath.split("/");
				const apptype = folders[folders.length - 3];
				let owner = folders[folders.length - 2];
				let app_url;

				switch (apptype) {
					case "developers":
						app_url = developers_url + "/" + encodeURIComponent(owner) + "/apps";
						break;

					case "companies":
						if (use_company_apps) {
							app_url = companies_url + "/" + encodeURIComponent(owner) + "/apps";
						}
						else {
							let dev_email = mapCompanyToDeveloper(owner);
							if (dev_email) {
								app_url = developers_url + "/" + encodeURIComponent(dev_email) + "/apps";
								owner = dev_email;
							}
							else {
								++key_err_count;
								grunt.log.error(`No developers for company ${owner}`);
								return;
							}
						}
						break;

					default:
						return;
				}

				let app = grunt.file.readJSON(filepath);
				let credentials = app.credentials;

				for (let i = 0; i < credentials.length; i++) {
					const cKey = credentials[i].consumerKey;
					const cSecret = credentials[i].consumerSecret;
					const products = credentials[i].apiProducts;

					const app_key_url = app_url + "/" + encodeURIComponent(app.name) + "/keys/";
					const key_url = app_key_url + encodeURIComponent(cKey);
					const create_key_url = app_key_url + "create";

					// Check if the key exists
					waitForGet(key_url, function (error, response, body) {
						let kstatus = 999;
						if (response)
							kstatus = response.statusCode;

						if (!error && kstatus == 200) {
							// Key already exists - replace it
							//grunt.verbose.writeln('Resp [' + kstatus + '] retrieving ' + this.appname + "/" + this.cKey + ' -> ' + body);

							// Compare existing and required products
							const existing_credentials = JSON.parse(body);
							const existing_products = existing_credentials.apiProducts;
							let products_match = true;
							let status_change = [];

							// Check if required products all exist at the correct statuses
							if (products_match) {
								for (let j = 0; j < this.products.length; j++) {
									let found = existing_products.filter((item) => item.apiproduct === this.products[j].apiproduct);

									// Product change required
									if (!found || found.length <= 0) {
										grunt.verbose.writeln(`Key ${this.appname} / ${this.cKey} is missing product ${this.products[j].apiproduct}`);
										products_match = false;
										break;
									}

									// Status change required
									if (found[0].status !== this.products[j].status) {
										grunt.verbose.writeln(`Key ${this.appname} / ${this.cKey} product ${found[0].apiproduct} status ${found[0].status} should be ${this.products[j].status}`);
										status_change.push(this.products[j]);
									}
								}
							}

							// Check if current products are no longer required
							if (products_match) {
								for (let j = 0; j < existing_products.length; j++) {
									let found = this.products.filter((item) => item.apiproduct === existing_products[j].apiproduct);

									if (!found || found.length <= 0) {
										grunt.verbose.writeln(`Key ${this.appname} / ${this.cKey} has unnecessary product ${existing_products[j].apiproduct}`);
										products_match = false;
										break;
									}
								}
							}

							if (!products_match) {
								grunt.verbose.writeln(`Removing existing key ${this.owner} / ${this.appname} / ${this.cKey}`);
								waitForDelete(this.key_url, function (error, response, body) {
									let dstatus = 999;
									if (response)
										dstatus = response.statusCode;

									if (!error && dstatus == 200) {
										++key_del_count;
										grunt.verbose.writeln('Resp [' + dstatus + '] deleting ' + this.appname + "/" + this.cKey + ' -> ' + body);

										// Key deleted - re-create it
										createAppKey(this.create_key_url, this.key_url, this.owner, this.appname, this.cKey, this.cSecret, this.products)
									}
									else {
										++key_del_err_count;
										grunt.verbose.error('ERROR Resp [' + dstatus + '] deleting ' + this.appname + "/" + this.cKey + ' -> ' + body);

										if (error) {
											grunt.verbose.error(error);
										}
									}
								}.bind({ url: key_url, owner: this.owner, appname: this.appname, cKey: this.cKey, cSecret: this.cSecret, products: this.products, create_key_url: this.create_key_url, key_url: this.key_url }));
							}
							else if (status_change.length > 0) {
								grunt.verbose.writeln(`Changing status of ${status_change.length} products on key ${this.appname} / ${this.cKey}`);
								for (let j = 0; j < status_change.length; j++) {
									setKeyProductStatus(this.key_url, status_change[j].apiproduct, status_change[j].status);
								}
							}
							else {
								++key_exists_count;
								grunt.verbose.writeln(`Key ${this.owner} / ${this.appname} / ${this.cKey} is up to date`);
							}
						}
						else if (kstatus == 404) {
							// Key does not exist - create it
							createAppKey(this.create_key_url, this.key_url, this.owner, this.appname, this.cKey, this.cSecret, this.products)
						}
						else {
							++key_err_count;
							grunt.verbose.error('ERROR Resp [' + kstatus + '] retrieving ' + this.appname + "/" + this.cKey + ' -> ' + body);

							if (error) {
								grunt.verbose.error(error);
							}
						}
					}.bind({ url: key_url, owner: owner, appname: app.name, cKey: cKey, cSecret: cSecret, products: products, key_url: key_url, create_key_url: create_key_url }));
				}
			});

			waitForCompletion(function () {
				let key_new_count = key_create_count - key_del_count;

				if (key_exists_count) {
					grunt.log.ok('Ignored ' + key_exists_count + ' matching app keys');
				}
				if (key_new_count) {
					grunt.log.ok('Created ' + key_new_count + ' app keys');
				}
				if (key_del_count) {
					grunt.log.ok('Replaced ' + key_del_count + ' app keys');
				}
				if (status_count) {
					grunt.log.ok('Updated the status of ' + status_count + ' API products against app keys');
				}
				if (key_err_count) {
					grunt.log.error('Failed to create ' + key_err_count + ' app keys');
				}
				if (key_del_err_count) {
					grunt.log.error('Failed to replace ' + key_del_err_count + ' app keys');
				}
				if (prod_err_count) {
					grunt.log.error('Failed to attach products to ' + prod_err_count + ' app keys');
				}
				if (status_err_count) {
					grunt.log.error('Failed to set the status of ' + status_err_count + ' app key API products');
				}

				done();
			});
		});
	});

	grunt.registerMultiTask('deleteKeys', 'Delete all app keys from org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let files = this.filesSrc;
		const companies_folder = path.dirname(grunt.config.get("importCompanies.src.data"));
		const done = this.async();

		const { useCompanyApps } = apigeeOrg(grunt, apigee.to);

		useCompanyApps(function (use_company_apps) {
			const url = apigee.to.url;
			const org = apigee.to.org;
			const userid = apigee.to.userid;
			const passwd = apigee.to.passwd;
			let app_count = 0;
			let cred_count = 0;
			let cred_err_count = 0;

			const { waitForDelete, waitForCompletion } = asyncrequest(grunt, userid, passwd);
			const { mapCompanyToDeveloper } = apigeeCompany(grunt, companies_folder);

			let f = grunt.option('src');
			if (f) {
				let opts = { flatten: false };

				grunt.verbose.writeln('src pattern = ' + f);
				files = grunt.file.expand(opts, f);
			}

			const developers_url = url + "/v1/organizations/" + org + "/developers";
			const companies_url = url + "/v1/organizations/" + org + "/companies";

			files.forEach(function (filepath) {
				const folders = filepath.split("/");
				const apptype = folders[folders.length - 3];
				let owner = folders[folders.length - 2];
				let app_url;

				switch (apptype) {
					case "developers":
						app_url = developers_url + "/" + encodeURIComponent(owner) + "/apps";
						break;

					case "companies":
						if (use_company_apps) {
							app_url = companies_url + "/" + encodeURIComponent(owner) + "/apps";
						}
						else {
							let dev_email = mapCompanyToDeveloper(owner);
							if (dev_email) {
								app_url = developers_url + "/" + encodeURIComponent(dev_email) + "/apps";
								owner = dev_email;
							}
							else {
								grunt.log.error(`No developers for company ${owner}`);
								return;
							}
						}
						break;

					default:
						return;
				}

				const app = grunt.file.readJSON(filepath);
				const credentials = app.credentials;

				++app_count;

				for (let i = 0; i < credentials.length; i++) {
					const cKey = credentials[i].consumerKey;
					grunt.verbose.writeln(`Deleting key ${owner} / ${app.name} / ${cKey}`);

					const delete_key_url = app_url + "/" + encodeURIComponent(app.name) + "/keys/" + encodeURIComponent(cKey);
					waitForDelete(delete_key_url, function (error, response, body) {
						let status = 999;
						if (response)
							status = response.statusCode;

						if (!error && status == 200) {
							++cred_count;
							grunt.verbose.writeln('Resp [' + status + '] deleting ' + this.appname + "/" + this.cKey + ' -> ' + body);
						}
						else {
							++cred_err_count;
							grunt.verbose.error('ERROR Resp [' + status + '] deleting ' + this.appname + "/" + this.cKey + ' -> ' + body);
						}
					}.bind({ url: delete_key_url, cKey: cKey, appname: app.name }));
				};
			});

			waitForCompletion(function () {
				if (cred_count) {
					grunt.log.ok('Deleted ' + cred_count + ' keys from ' + app_count + ' apps');
				}
				if (cred_err_count) {
					grunt.log.error('Failed to delete ' + cred_err_count + ' app keys');
				}

				done();
			});
		});
	});
};