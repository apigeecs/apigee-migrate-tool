/*jslint node: true */
'use strict';

const path = require('path');
const request = require('request');
const apigee = require('../config.js');


module.exports = function (grunt) {
	grunt.registerTask('exportProducts', 'Export all products from org ' + apigee.from.org + " [" + apigee.from.version + "]", function () {
		let url = apigee.from.url;
		let org = apigee.from.org;
		let userid = apigee.from.userid;
		let passwd = apigee.from.passwd;
		let filepath = grunt.config.get("exportProducts.dest.data");
		let products;
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

		grunt.verbose.writeln("========================= export Products ===========================");

		grunt.verbose.writeln("getting products..." + url);
		url = url + "/v1/organizations/" + org + "/apiproducts";

		waitForRequest(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				grunt.log.write("PRODUCTS: " + body);
				products = JSON.parse(body);

				if (products.length == 0) {
					grunt.verbose.writeln("No Products");
					done();
				}

				for (let i = 0; i < products.length; i++) {
					let product_url = url + "/" + encodeURIComponent(products[i]);
					grunt.file.mkdir(filepath);

					grunt.verbose.writeln("PRODUCT URL: " + product_url.length + " " + product_url);
					// An Edge bug allows products to be created with very long names which cannot be used in URLs.
					if (product_url.length > 1024) {
						grunt.log.write("SKIPPING Product, URL too long: ");
					} else {
						// Retrieve product details
						waitForRequest(product_url, function (error, response, body) {
							if (!error && response.statusCode == 200) {
								grunt.verbose.writeln("PRODUCT " + body);
								let product_detail = JSON.parse(body);

								if (product_detail && product_detail.name) {
									let dev_file = filepath + "/" + product_detail.name;
									grunt.file.write(dev_file, body);

									grunt.verbose.writeln('Exported Product ' + product_detail.name);
								}
							}
							else {
								grunt.log.error('Error exporting product ' + product_url);

								if (error) {
									grunt.log.error(error);
								}
							}
						});
					}
					// End product details
				};
			}
			else {
				grunt.log.error(error);
			}
		});


		// Set a 1s timer to wait for pending requests to complete
		let intervalId = setInterval(function () {
			if (pending_tasks <= 0) {
				if (products.length <= 0) {
					grunt.verbose.writeln("No API Products");
				}
				else {
					grunt.log.ok('Processed ' + products.length + ' API products');
				}
				grunt.verbose.writeln("================== export API Products DONE()");

				clearInterval(intervalId);
				done();
			}
			else {
				grunt.verbose.writeln('Waiting for ' + pending_tasks + ' pending requests');
			}
		}, 1000);
	});

	grunt.registerMultiTask('importProducts', 'Import all products to org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let files = this.filesSrc;
		let done_count = 0;
		let done = this.async();

		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts, f);
		}

		url = url + "/v1/organizations/" + org + "/apiproducts";

		files.forEach(function (filepath) {
			let content = grunt.file.read(filepath);
			let product_name = path.basename(filepath);

			request.post({
				headers: { 'content-type': 'application/json' },
				url: url,
				body: content
			}, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;
				grunt.verbose.writeln('Resp [' + status + '] for product creation ' + this.url + ' -> ' + body);
				if (error || status != 201) {
					grunt.verbose.error('ERROR Resp [' + status + '] for product ' + product_name + ' creation -> ' + body);
				}
				done_count++;
				if (done_count == files.length) {
					grunt.log.ok('Processed ' + done_count + ' products');
					done();
				}
			}.bind({ url: url })).auth(userid, passwd, true);

		});
	});

	grunt.registerMultiTask('deleteProducts', 'Delete all products from org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let files = this.filesSrc;
		let done_count = 0;
		let opts = { flatten: false };
		let f = grunt.option('src');
		if (f) {
			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts, f);
		}
		url = url + "/v1/organizations/" + org + "/apiproducts/";
		let done = this.async();
		files.forEach(function (filepath) {
			let content = grunt.file.read(filepath);
			let product = JSON.parse(content);
			let del_url = url + product.name;
			grunt.verbose.writeln(del_url);
			request.del(del_url, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;
				grunt.verbose.writeln('Resp [' + status + '] for product deletion ' + this.del_url + ' -> ' + body);
				if (error || status != 200) {
					grunt.verbose.error('ERROR Resp [' + status + '] for product deletion ' + this.del_url + ' -> ' + body);
				}
				done_count++;
				if (done_count == files.length) {
					grunt.log.ok('Processed ' + done_count + ' products');
					done();
				}
			}.bind({ del_url: del_url })).auth(userid, passwd, true);

		});
	});

};
