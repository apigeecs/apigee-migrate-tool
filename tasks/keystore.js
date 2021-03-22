/*jslint node: true */
'use strict';

const { profileEnd } = require('console');
const path = require('path');
const request = require('request');
const apigee = require('../config.js');


module.exports = function (grunt) {
	grunt.registerTask('exportKeyStores', 'Export all keystores from org ' + apigee.from.org + " [" + apigee.from.version + "]", function () {
		let url = apigee.from.url;
		let org = apigee.from.org;
		let env = apigee.from.env;
		let userid = apigee.from.userid;
		let passwd = apigee.from.passwd;
		let filepath = grunt.config.get("exportKeyStores.dest.data");
		let keystores = [];
		let pending_tasks = 0;
		let done = this.async();

		const waitForRequest = function (url, callback) {
			++pending_tasks;
			let r = request(url, function (error, response, body) {
				callback(error, response, body);
				--pending_tasks;
			}).auth(userid, passwd, true);

			return r;
		}

		grunt.verbose.writeln("========================= export KeyStores ===========================");

		// Get keystore list
		grunt.verbose.writeln("getting keystores..." + url);
		url = url + "/v1/organizations/" + org + "/environments/" + env + "/keystores";

		waitForRequest(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				grunt.log.write("KEYSTORES: " + body);
				keystores = JSON.parse(body);

				for (let i = 0; i < keystores.length; i++) {
					let keystore_url = url + "/" + keystores[i];
					let keystore_path = path.join(filepath, keystores[i]);
					grunt.file.mkdir(keystore_path);

					// Get keystore details
					grunt.verbose.writeln("KEYSTORE URL: " + keystore_url.length + " " + keystore_url);
					waitForRequest(keystore_url, function (error, response, body) {
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

									waitForRequest(cert_url, function (error, response, body) {
										if (!error && response.statusCode == 200) {
											grunt.file.write(cert_file, body);
											grunt.verbose.writeln('Exported certificate ' + cert);
										}
										else {
											grunt.log.error('Error ' + response.statusCode + ' exporting certificate from ' + cert_url);
											if (error) {
												grunt.log.error(error);
											}
										}
									});
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

		// Set a 1s timer to wait for pending requests to complete
		let intervalId = setInterval(function () {
			if (pending_tasks <= 0) {
				if (keystores.length <= 0) {
					grunt.verbose.writeln("No KeyStores");
				}
				else {
					grunt.log.ok('Processed ' + keystores.length + ' keystores');
				}
				grunt.verbose.writeln("================== export keystores DONE()");

				clearInterval(intervalId);
				done();
			}
			else {
				grunt.verbose.writeln('Waiting for ' + pending_tasks + ' pending requests');
			}
		}, 1000);
	});

	grunt.registerMultiTask('importKeyStores', 'Import all keystores to org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let env = apigee.to.env;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let keystores = this.filesSrc;
		let pending_tasks = 0;
		let done = this.async();

		const waitForPost = function (url, opts, callback) {
			let boundcb = callback.bind({ url: url });

			++pending_tasks;
			let r = request.post({ url: url, ...opts }, function (error, response, body) {
				boundcb(error, response, body);
				--pending_tasks;
			}).auth(userid, passwd, true);

			return r;
		}

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
					grunt.log.error('ERROR Resp [' + status + '] for keystore creation ' + this.url + ' -> ' + body);
					if (error) {
						grunt.log.error(error);
					}
				}
			});
		});

		// Set a 1s timer to wait for pending requests to complete
		let intervalId = setInterval(function () {
			if (pending_tasks <= 0) {
				if (keystores.length <= 0) {
					grunt.verbose.writeln("No KeyStores");
				}
				else {
					grunt.log.ok('Processed ' + keystores.length + ' keystores');
				}
				grunt.verbose.writeln("================== import keystores DONE()");

				clearInterval(intervalId);
				done();
			}
			else {
				grunt.verbose.writeln('Waiting for ' + pending_tasks + ' pending requests');
			}
		}, 1000);
	});

	/*
		grunt.registerMultiTask('deleteProducts', 'Delete all products from org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
			let url = apigee.to.url;
			let org = apigee.to.org;
			let userid = apigee.to.userid;
			let passwd = apigee.to.passwd;
			let files = this.filesSrc;
			let done_count = 0;
			let opts = {flatten: false};
			let f = grunt.option('src');
			if (f)
			{
				grunt.verbose.writeln('src pattern = ' + f);
				files = grunt.file.expand(opts,f);
			}
			url = url + "/v1/organizations/" + org + "/apiproducts/";
			let done = this.async();
			files.forEach(function(filepath) {
				let content = grunt.file.read(filepath);
				let product = JSON.parse(content);
				let del_url = url + product.name;
				grunt.verbose.writeln(del_url);	
				request.del(del_url, function(error, response, body){
					let status = 999;
					if (response)	
					status = response.statusCode;
					grunt.verbose.writeln('Resp [' + status + '] for product deletion ' + this.del_url + ' -> ' + body);
					if (error || status!=200)
					{ 
						grunt.verbose.error('ERROR Resp [' + status + '] for product deletion ' + this.del_url + ' -> ' + body); 
					}
					done_count++;
					if (done_count == files.length)
					{
						grunt.log.ok('Processed ' + done_count + ' products');
						done();
					}
				}.bind( {del_url: del_url}) ).auth(userid, passwd, true);
	
			});
		});
	*/
};
