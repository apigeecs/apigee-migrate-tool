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
		let product_count = 0;
		let product_create_count = 0;
		let product_update_count = 0;
		let product_err_count = 0;
		let done = this.async();

		const { waitForGet, waitForPost, waitForPut, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts, f);
		}

		url = url + "/v1/organizations/" + org + "/apiproducts";

		files.forEach(function (filepath) {
			let content = grunt.file.read(filepath);
			let product_content = JSON.parse(content);
			let product_name = path.basename(filepath);

			++product_count;

			let product_url = url + "/" + encodeURIComponent(product_name);

			// Perform environment rename(s) if required
			if ((from_env != to_env) || env_map) {
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

			waitForGet(product_url, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;

				if (!error && (status == 200)) {
					// Product already exists
					let existingProduct = JSON.parse(body);

					// Is the import file newer than the instance in Apigee?
					if (existingProduct.lastModifiedAt && (existingProduct.lastModifiedAt < this.product_content.lastModifiedAt)) {
						grunt.verbose.writeln(`Updating API product: ${this.product_name}`);

						waitForPut(this.url, {
							headers: { 'content-type': 'application/json' },
							body: content
						}, function (error, response, body) {
							let ustatus = 999;
							if (response)
								ustatus = response.statusCode;

							if (!error && (ustatus == 200 || ustatus == 201)) {
								++product_update_count
								grunt.verbose.writeln('Resp [' + ustatus + '] for product update ' + this.url + ' -> ' + body);
							} else {
								++product_err_count;
								grunt.verbose.error('ERROR Resp [' + ustatus + '] for product ' + this.product_name + ' update -> ' + body);
								if (error) {
									grunt.log.error(error);
								}
							}
						}.bind({ url: this.url, product_name: this.product_name }));
					} else {
						grunt.verbose.writeln(`API product: ${this.product_name} is up to date`);
					}
				} else if (status == 404) {
					// Product does not exist
					grunt.verbose.writeln(`Creating API product: ${this.product_name}`);

					waitForPost(url, {
						headers: { 'content-type': 'application/json' },
						body: content
					}, function (error, response, body) {
						let cstatus = 999;
						if (response)
							cstatus = response.statusCode;

						if (!error && (cstatus == 201)) {
							++product_create_count
							grunt.verbose.writeln('Resp [' + cstatus + '] for product creation ' + this.url + ' -> ' + body);
						} else {
							++product_err_count;
							grunt.verbose.error('ERROR Resp [' + cstatus + '] for product ' + this.product_name + ' creation -> ' + body);
							if (error) {
								grunt.log.error(error);
							}
						}
					}.bind({ url: url, product_name: this.product_name }));
				} else {
					// Error fetching product details
					++product_err_count;
					grunt.verbose.error('ERROR Resp [' + status + '] retrieving details for product ' + this.product_name);
					if (error) {
						grunt.log.error(error);
					}
				}
			}.bind({ url: product_url, product_name: product_name, product_content: product_content }));
		});

		waitForCompletion(function () {
			if (product_count) {
				grunt.log.ok('Processed ' + product_count + ' API products');
			} else {
				grunt.log.ok("No API Products");
			}
			if (product_create_count) {
				grunt.log.ok('Created ' + product_create_count + ' API products');
			}
			if (product_update_count) {
				grunt.log.ok('Updated ' + product_update_count + ' API products');
			}
			if (product_err_count) {
				grunt.log.error('Failed to create/update ' + product_err_count + ' API products');
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
