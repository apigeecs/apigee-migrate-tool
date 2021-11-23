/*jslint node: true */
'use strict';

const path = require('path');
const apigee = require('../config.js');
const asyncrequest = require('../util/asyncrequest.lib.js');


module.exports = function (grunt) {
	grunt.registerTask('exportKeyStores', 'Export all keystores from org ' + apigee.from.org + ' environment ' + apigee.from.env + " [" + apigee.from.version + "]", function () {
		let url = apigee.from.url;
		let org = apigee.from.org;
		let env = apigee.from.env;
		let userid = apigee.from.userid;
		let passwd = apigee.from.passwd;
		let filepath = grunt.config.get("exportKeyStores.dest.data");
		let keystores = [];
		let done = this.async();

		const { waitForGet, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		grunt.verbose.writeln("========================= export KeyStores ===========================");

		// Get keystore list
		grunt.verbose.writeln("getting keystores..." + url);
		url = url + "/v1/organizations/" + org + "/environments/" + env + "/keystores";

		waitForGet(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				grunt.log.write("KEYSTORES: " + body);
				keystores = JSON.parse(body);

				for (let i = 0; i < keystores.length; i++) {
					let keystore_url = url + "/" + keystores[i];
					let keystore_path = path.join(filepath, keystores[i]);
					grunt.file.mkdir(keystore_path);

					// Get keystore details
					grunt.verbose.writeln("KEYSTORE URL: " + keystore_url.length + " " + keystore_url);
					waitForGet(keystore_url, function (error, response, body) {
						if (!error && response.statusCode == 200) {
							grunt.verbose.writeln("KEYSTORE " + body);
							let keystore_detail = JSON.parse(body);

							let data_file = path.join(filepath, keystore_detail.name, "data");
							grunt.file.write(data_file, body);

							// Get certificates
							if (keystore_detail.certs) {
								grunt.verbose.writeln("Exporting " + keystore_detail.certs.length + " certificates from keystore " + keystore_detail.name);

								let cert_path = path.join(keystore_path, "certs");
								grunt.file.mkdir(cert_path);

								for (let c = 0; c < keystore_detail.certs.length; c++) {
									let cert = keystore_detail.certs[c];
									let cert_url = keystore_url + "/certs/" + cert + "/export";
									let cert_file = path.join(cert_path, cert);

									grunt.verbose.writeln("Exporting certificate" + cert + " from " + cert_url);

									waitForGet(cert_url, function (error, response, body) {
										if (!error && response.statusCode == 200) {
											grunt.file.write(cert_file, body);
											grunt.verbose.writeln('Exported certificate ' + cert);
										}
										else {
											grunt.log.error('Error ' + response.statusCode + ' exporting certificate from ' + this.url);
											if (error) {
												grunt.log.error(error);
											}
										}
									}.bind({ url: cert_url }));
								}
							}

							grunt.verbose.writeln('Exported Keystore ' + keystore_detail.name);
						}
						else {
							grunt.log.error('Error ' + response.statusCode + ' exporting Keystore from ' + keystore_url);
							if (error) {
								grunt.log.error(error);
							}
						}
					});

					// End keystore details
				};
			}
			else {
				grunt.log.error(error);
			}
		});

		waitForCompletion(function () {
			if (keystores.length <= 0) {
				grunt.verbose.writeln("No KeyStores");
			}
			else {
				grunt.log.ok('Processed ' + keystores.length + ' keystores');
			}
			grunt.verbose.writeln("================== export keystores DONE()");

			done();
		});
	});

	grunt.registerMultiTask('importKeyStores', 'Import all keystores to org ' + apigee.to.org + ' environment ' + apigee.to.env + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let env = apigee.to.env;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let keystores = this.filesSrc;
		let done = this.async();

		const { waitForPost, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		grunt.verbose.writeln("========================= import KeyStores ===========================");

		// Build source list
		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			keystores = grunt.file.expand(opts, f);
		}

		url = url + "/v1/organizations/" + org + "/environments/" + env + "/keystores";

		// Create keystores
		keystores.forEach(function (keystorePath) {
			let keystoreDef = path.join(keystorePath, "data");
			let keystoreName = path.basename(keystorePath);

			if (!grunt.file.exists(keystoreDef)) {
				grunt.verbose.writeln("No definition found for keystore " + keystoreName);
				return;
			}

			let content = grunt.file.read(keystoreDef);

			grunt.verbose.writeln("Creating keystore " + keystoreName);
			waitForPost(url, {
				headers: { 'content-type': 'application/json' },
				body: content
			}, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;

				if (!error && status == 201) {
					grunt.verbose.writeln('Resp [' + status + '] for keystore creation ' + this.url + ' -> ' + body);
					grunt.verbose.writeln('Created keystore ' + keystoreName);
				}
				else {
					grunt.log.error('ERROR Resp [' + status + '] for keystore creation ' + this.keystoreName + ' -> ' + body);
					if (error) {
						grunt.log.error(error);
					}
				}
			}.bind({ url: url, keystoreName: keystoreName }));
		});

		waitForCompletion(function () {
			if (keystores.length <= 0) {
				grunt.verbose.writeln("No KeyStores");
			}
			else {
				grunt.log.ok('Processed ' + keystores.length + ' keystores');
			}
			grunt.verbose.writeln("================== import keystores DONE()");

			done();
		});
	});

	grunt.registerMultiTask('deleteKeyStores', 'Delete all keystores from org ' + apigee.to.org + ' environment ' + apigee.to.env + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let env = apigee.to.env;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let keystores = this.filesSrc;
		let done = this.async();

		const { waitForDelete, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		grunt.verbose.writeln("========================= delete KeyStores ===========================");

		// Build keystore list
		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			keystores = grunt.file.expand(opts, f);
		}

		url = url + "/v1/organizations/" + org + "/environments/" + env + "/keystores";

		// Delete keystores
		keystores.forEach(function (keystorePath) {
			let keystoreName = path.basename(keystorePath);

			let del_url = url + "/" + keystoreName;
			waitForDelete(del_url, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;

				if (!error && status == 200) {
					grunt.verbose.writeln('Resp [' + status + '] for keystore deletion ' + this.url + ' -> ' + body);
					grunt.verbose.writeln('Deleted keystore ' + keystoreName);
				}
				else {
					grunt.log.error('ERROR Resp [' + status + '] for keystore deletion ' + this.keystoreName + ' -> ' + body);
					if (error) {
						grunt.log.error(error);
					}
				}
			}.bind({ url: del_url, keystoreName: keystoreName }));
		});

		waitForCompletion(function () {
			if (keystores.length <= 0) {
				grunt.verbose.writeln("No KeyStores");
			}
			else {
				grunt.log.ok('Deleted ' + keystores.length + ' keystores');
			}
			grunt.verbose.writeln("================== delete keystores DONE()");

			done();
		});
	});
};
