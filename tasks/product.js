/*jslint node: true */
'use strict';

const path = require('path');
const apigee = require('../config.js');
const asyncrequest = require('../util/asyncrequest.lib.js');


module.exports = function (grunt) {
	grunt.registerTask('exportProducts', 'Export all products from org ' + apigee.from.org + " [" + apigee.from.version + "]", function () {
		let url = apigee.from.url;
		let org = apigee.from.org;
		let userid = apigee.from.userid;
		let passwd = apigee.from.passwd;
		let filepath = grunt.config.get("exportProducts.dest.data");
		let products;
		let done = this.async();

		const { waitForGet, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		grunt.verbose.writeln("========================= export Products ===========================");

		grunt.verbose.writeln("getting products..." + url);
		url = url + "/v1/organizations/" + org + "/apiproducts";

		waitForGet(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				grunt.log.write("PRODUCTS: " + body);
				products = JSON.parse(body);

				if (products.length == 0) {
					return;
				}

				for (let i = 0; i < products.length; i++) {
					let product_url = url + "/" + encodeURIComponent(products[i]);
					grunt.file.mkdir(filepath);

					grunt.verbose.writeln("PRODUCT URL: " + product_url.length + " " + product_url);

					// An Edge bug allows products to be created with very long names which cannot be used in URLs.
					if (product_url.length > 1024) {
						grunt.log.write("SKIPPING Product, URL too long: " + products[i]);
						continue;
					}

					// Retrieve product details
					waitForGet(product_url, function (error, response, body) {
						if (!error && response.statusCode == 200) {
							grunt.verbose.writeln("PRODUCT " + body);
							let product_detail = JSON.parse(body);

							if (product_detail && product_detail.name) {
								let dev_file = path.join(filepath, product_detail.name);
								grunt.file.write(dev_file, body);

								grunt.verbose.writeln('Exported Product ' + product_detail.name);
							}
						}
						else {
							grunt.log.error('Error exporting product ' + this.url);

							if (error) {
								grunt.log.error(error);
							}
						}
					}.bind({ url: product_url }));
					// End product details
				};
			}
			else {
				grunt.log.error(error);
			}
		});

		waitForCompletion(function () {
			if (products.length <= 0) {
				grunt.verbose.writeln("No API Products");
			}
			else {
				grunt.log.ok('Processed ' + products.length + ' API products');
			}
			grunt.verbose.writeln("================== export API Products DONE()");

			done();
		});
	});

	grunt.registerMultiTask('importProducts', 'Import all products to org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let from_env = apigee.from.env;
		let to_env = apigee.to.env;
		let env_map = apigee.environments;
		let files = this.filesSrc;
		let done = this.async();

		const { waitForPost, waitForCompletion } = asyncrequest(grunt, userid, passwd);

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

			// Perform environment rename(s) if required
			if ((from_env != to_env) || env_map) {
				let product_content = JSON.parse(content);
				let product_modified = false;

				if (product_content.environments) {
					for (let i = 0; i < product_content.environments.length; i++) {
						if (product_content.environments[i] == from_env) {
							product_content.environments[i] = to_env;
							product_modified = true;
						}
						else if (env_map && env_map[product_content.environments[i]]) {
							product_content.environments[i] = env_map[product_content.environments[i]];
							product_modified = true;
						}
					}
				}

				if (product_modified) {
					content = JSON.stringify(product_content);
				}
			}

			waitForPost(url, {
				headers: { 'content-type': 'application/json' },
				body: content
			}, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;
				grunt.verbose.writeln('Resp [' + status + '] for product creation ' + this.url + ' -> ' + body);
				if (error || status != 201) {
					grunt.verbose.error('ERROR Resp [' + status + '] for product ' + this.product_name + ' creation -> ' + body);
				}
			}.bind({ url: url, product_name: product_name }));
		});

		waitForCompletion(function () {
			if (files.length <= 0) {
				grunt.verbose.writeln("No API Products");
			}
			else {
				grunt.log.ok('Processed ' + files.length + ' API products');
			}

			done();
		});
	});

	grunt.registerMultiTask('deleteProducts', 'Delete all products from org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let files = this.filesSrc;
		let del_count = 0;
		let del_err_count = 0;
		let done = this.async();

		const { waitForDelete, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts, f);
		}

		url = url + "/v1/organizations/" + org + "/apiproducts/";

		files.forEach(function (filepath) {
			let content = grunt.file.read(filepath);
			let product = JSON.parse(content);

			let del_url = url + encodeURIComponent(product.name);
			grunt.verbose.writeln(del_url);

			waitForDelete(del_url, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;

				if (!error && status == 200) {
					++del_count;
					grunt.verbose.writeln('Resp [' + status + '] for product deletion ' + this.url + ' -> ' + body);
				}
				else {
					grunt.verbose.error('ERROR Resp [' + status + '] for product deletion ' + this.url + ' -> ' + body);
				}
			}.bind({ url: del_url }));
		});

		waitForCompletion(function () {
			if (del_count) {
				grunt.log.ok('Deleted ' + del_count + ' API products');
			}
			if (del_err_count) {
				grunt.log.error('Failed to delete ' + del_err_count + ' API products');
			}

			done();
		});
	});
};
