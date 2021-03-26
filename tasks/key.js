/*jslint node: true */
'use strict';
const apigee = require('../config.js');
const asyncrequest = require('../util/asyncrequest.lib.js');

module.exports = function (grunt) {
	grunt.registerMultiTask('importKeys', 'Import all app keys to org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let files = this.filesSrc;
		let key_count = 0;
		let key_err_count = 0;
		let prod_err_count = 0;
		let approve_err_count = 0;
		let done = this.async();

		const { waitForPost, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts, f);
		}

		const developers_url = url + "/v1/organizations/" + org + "/developers";
		const companies_url = url + "/v1/organizations/" + org + "/companies";

		files.forEach(function (filepath) {
			let folders = filepath.split("/");
			let apptype = folders[folders.length - 3];
			let owner = folders[folders.length - 2];
			let app_url;

			switch (apptype) {
				case "developers":
					app_url = developers_url + "/" + encodeURIComponent(owner) + "/apps";
					break;

				case "companies":
					app_url = companies_url + "/" + encodeURIComponent(owner) + "/apps";
					break;

				default:
					return;
			}

			let app = grunt.file.readJSON(filepath);
			let credentials = app.credentials;

			for (let i = 0; i < credentials.length; i++) {
				let cKey = credentials[i].consumerKey;
				let cSecret = credentials[i].consumerSecret;
				let products = credentials[i].apiProducts;

				let key_url = app_url + "/" + encodeURIComponent(app.name) + "/keys/";

				// Create the key
				grunt.verbose.writeln('Creating key ' + app.name + ' / ' + cKey);
				let key_payload = "<CredentialRequest><ConsumerKey>" + cKey + "</ConsumerKey><ConsumerSecret>" + cSecret + "</ConsumerSecret><Attributes></Attributes></CredentialRequest>";

				let create_key_url = key_url + "create";
				waitForPost(create_key_url, {
					headers: { 'Content-Type': 'application/xml' },
					body: key_payload
				}, function (error, response, body) {
					let status = 999;
					if (response)
						status = response.statusCode;

					if (!error && status == 201) {
						++key_count;
						grunt.verbose.writeln('Resp [' + status + '] for ' + this.owner + ' - ' + this.url + ' -> ' + body);

						// Attach products to key
						let products_payload = {};
						let prods = [];
						for (let j = 0; j < products.length; j++) {
							prods.push(products[j].apiproduct);
						};
						products_payload['apiProducts'] = prods;

						grunt.verbose.writeln('Attaching ' + prods.length + ' products to key ' + this.appname + ' / ' + cKey);

						let attach_key_url = key_url + encodeURIComponent(cKey);
						waitForPost(attach_key_url, {
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(products_payload)
						}, function (error, response, body) {
							let status = 999;
							if (response)
								status = response.statusCode;

							if (!error && status == 200) {
								grunt.verbose.writeln('Resp [' + status + '] for ' + this.owner + ' - ' + this.appname + ' - ' + this.products + ' - ' + this.cKey + ' product assignment -> ' + body);

								// Approve products for key
								for (let k = 0; k < this.prods.length; k++) {
									let approve_key_url = key_url + encodeURIComponent(cKey) + "/apiproducts/" + encodeURIComponent(this.prods[k]) + "?action=approve";
									grunt.verbose.writeln("Approving product for key - " + approve_key_url);

									waitForPost(approve_key_url, {}, function (error, response, body) {
										let status = 999;
										if (response)
											status = response.statusCode;

										if (!error && status == 204) {
											grunt.verbose.writeln('Resp [' + status + '] for ' + this.owner + ' - ' + this.appname + ' - ' + this.product + ' - ' + this.cKey + ' - ' + this.url + ' -> ' + body);
										}
										else {
											// Failed to approve product for key
											++approve_err_count;
											grunt.verbose.error('ERROR Resp [' + status + '] for ' + this.owner + ' - ' + this.appname + ' - ' + this.product + ' - ' + this.cKey + ' - ' + this.url + ' -> ' + body);

											if (error) {
												grunt.verbose.error(error);
											}
										}
									}.bind({ url: approve_key_url, owner: this.owner, cKey: cKey, appname: this.appname, product: this.prods[k] }));
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
						}.bind({ url: attach_key_url, owner: this.owner, cKey: cKey, appname: this.appname, products: JSON.stringify(products_payload), prods: prods }));
					}
					else {
						// Failed to create key
						++key_err_count;
						grunt.verbose.error('ERROR Resp [' + status + '] for ' + this.owner + ' - ' + this.url + ' -> ' + body);

						if (error) {
							grunt.verbose.error(error);
						}
					}
				}.bind({ url: create_key_url, owner: owner, appname: app.name }));
			}
		});

		waitForCompletion(function () {
			if (key_count) {
				grunt.log.ok('Imported ' + key_count + ' app keys');
			}
			if (key_err_count) {
				grunt.log.error('Failed to import ' + key_err_count + ' app keys');
			}
			if (prod_err_count) {
				grunt.log.error('Failed to attach products to ' + prod_err_count + ' app keys');
			}
			if (approve_err_count) {
				grunt.log.error('Failed to approve ' + approve_err_count + ' app key products');
			}

			done();
		});
	});

	grunt.registerMultiTask('deleteKeys', 'Delete all app keys from org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let app_count = 0;
		let cred_count = 0;
		let cred_err_count = 0;
		let files = this.filesSrc;
		let done = this.async();

		const { waitForDelete, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts, f);
		}

		const developers_url = url + "/v1/organizations/" + org + "/developers";
		const companies_url = url + "/v1/organizations/" + org + "/companies";

		files.forEach(function (filepath) {
			let folders = filepath.split("/");
			let apptype = folders[folders.length - 3];
			let owner = folders[folders.length - 2];
			let app_url;

			switch (apptype) {
				case "developers":
					app_url = developers_url + "/" + encodeURIComponent(owner) + "/apps";
					break;

				case "companies":
					app_url = companies_url + "/" + encodeURIComponent(owner) + "/apps";
					break;

				default:
					return;
			}

			let app = grunt.file.readJSON(filepath);
			let credentials = app.credentials;

			++app_count;

			for (let i = 0; i < credentials.length; i++) {
				let cKey = encodeURIComponent(credentials[i].consumerKey);
				let delete_key_url = app_url + "/" + encodeURIComponent(app.name) + "/keys/" + cKey;

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
};