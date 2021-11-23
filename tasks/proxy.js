/*jslint node: true */
'use strict';

const fs = require('fs');
const path = require('path');
const apigee = require('../config.js');
const asyncrequest = require('../util/asyncrequest.lib.js');

const proxy_file_json = 'data';
const proxy_file_package = 'proxy.zip';

module.exports = function (grunt) {
	grunt.registerTask('exportProxies', 'Export all proxies from org ' + apigee.from.org + " [" + apigee.from.version + "]", function () {
		let url = apigee.from.url;
		let org = apigee.from.org;
		let userid = apigee.from.userid;
		let passwd = apigee.from.passwd;
		let filepath = grunt.config.get("exportProxies.dest.data");
		let proxies = [];
		let proxy_count = 0;
		let proxy_err_count = 0;
		let done = this.async();

		const { waitForGet, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		grunt.verbose.writeln("========================= export Proxies ===========================");

		url = url + "/v1/organizations/" + org + "/apis";
		grunt.verbose.writeln("getting proxies: " + url);

		waitForGet(url, function (error, response, body) {
			let lstatus = 999;
			if (response && response.statusCode)
				lstatus = response.statusCode;

			if (!error && lstatus == 200) {
				proxies = JSON.parse(body);

				if (proxies.length > 0)
					grunt.file.mkdir(filepath);

				for (let i = 0; i < proxies.length; i++) {
					let proxy_url = url + "/" + encodeURIComponent(proxies[i]);

					let proxy_dir = path.join(filepath, proxies[i]);
					grunt.file.mkdir(proxy_dir);

					//Call proxy details
					waitForGet(proxy_url, function (error, response, body) {
						let pstatus = 999;
						if (response && response.statusCode)
							pstatus = response.statusCode;

						if (!error && pstatus == 200) {
							grunt.verbose.writeln(`Exporting proxy ${proxies[i]}`);
							grunt.file.write(path.join(proxy_dir, proxy_file_json), body);

							let proxy_detail = JSON.parse(body);

							// gets max revision - May not be the deployed version
							let max_rev = proxy_detail.revision[proxy_detail.revision.length - 1];

							let proxy_download_url = url + "/" + encodeURIComponent(proxy_detail.name) + "/revisions/" + max_rev + "?format=bundle";
							grunt.verbose.writeln("Fetching proxy bundle: " + proxy_download_url);

							waitForGet(proxy_download_url, null, function (req) {
								req.pipe(fs.createWriteStream(path.join(proxy_dir, proxy_file_package)))
									.on('close', function () {
										grunt.verbose.writeln(`Proxy ${this.proxy} version ${this.version} exported!`);
										++proxy_count;
									}.bind({ proxy: this.proxy, version: this.version }));
							}.bind({ proxy: proxy_detail.name, version: max_rev }));
						}
						else {
							// Failed to get proxy details
							++proxy_err_count;
							grunt.log.error('Resp [' + pstatus + '] for proxy details ' + this.url + ' -> ' + body);

							if (error) {
								grunt.log.error(error);
							}
						}
					}.bind({ url: proxy_url }));
				};
			}
			else {
				// Failed to get proxy list
				grunt.log.error('Resp [' + lstatus + '] for proxy list ' + this.url + ' -> ' + body);

				if (error) {
					grunt.log.error(error);
				}
			}
		}.bind({ url: url }));

		waitForCompletion(function () {
			if (proxies.length <= 0) {
				grunt.log.ok("No proxies");
			}
			else {
				if (proxy_count) {
					grunt.log.ok(`Exported  ${proxy_count} proxies`);
				}
				if (proxy_err_count) {
					grunt.log.error(`Failed to export ${proxy_err_count} proxies`);
				}
			}

			grunt.verbose.writeln("================== export proxies DONE()");
			done();
		});
	});

	grunt.registerMultiTask('importProxies', 'Import all proxies to org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		const force_update = grunt.option("force-update");
		let url = apigee.to.url;
		let org = apigee.to.org;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let files = this.filesSrc;
		let proxy_count = 0;
		let proxy_err_count = 0;
		let done = this.async();

		const { waitForGet, waitForPost, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		const import_url = url + "/v1/organizations/" + org + "/apis?action=import&name=";
		const proxy_url = url + "/v1/organizations/" + org + "/apis";

		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts, f);
		}

		files.forEach(function (filepath) {
			let name = path.basename(filepath);
			let proxy_details_url = proxy_url + "/" + encodeURIComponent(name);
			let proxy_import_url = import_url + encodeURIComponent(name);

			waitForGet(proxy_details_url, function (error, response, body) {
				let dstatus = 999;
				if (response && response.statusCode)
					dstatus = response.statusCode;

				let import_proxy = false;

				if (!error && dstatus == 200) {
					let existing_proxy = JSON.parse(body);
					let new_proxy = grunt.file.readJSON(path.join(filepath, proxy_file_json));

					// Is the proxy being imported newer than the existing one?
					let new_date = 0;
					if (new_proxy && new_proxy.metaData && new_proxy.metaData.lastModifiedAt) {
						new_date = new_proxy.metaData.lastModifiedAt;
					}
					let existing_date = -1;
					if (existing_proxy && existing_proxy.metaData && existing_proxy.metaData.lastModifiedAt) {
						existing_date = existing_proxy.metaData.lastModifiedAt;
					}

					if (new_date > existing_date) {
						grunt.verbose.writeln(`Updating proxy ${this.proxy_name}`);
						import_proxy = true;
					} else if (force_update) {
						grunt.verbose.writeln(`Forcibly updating proxy ${this.proxy_name}`);
						import_proxy = true;
					} else {
						grunt.verbose.writeln(`Proxy ${this.proxy_name} is up to date`);
					}
				} else if (dstatus == 404) {
					grunt.verbose.writeln(`Creating proxy ${this.proxy_name}`);
					import_proxy = true;
				} else {
					++proxy_err_count;
					grunt.log.error('Resp [' + dstatus + '] for proxy details ' + this.url + ' -> ' + body);

					if (error) {
						grunt.log.error(error);
					}
				}

				if (import_proxy) {
					waitForPost(proxy_import_url, {}, function (error, response, body) {
						let pstatus = 999;
						if (response && response.statusCode)
							pstatus = response.statusCode;

						if (error) {
							++proxy_err_count;
							grunt.log.error('Resp [' + pstatus + '] for proxy creation ' + this.url + ' -> ' + body);
							grunt.log.error(error);
						} else {
							++proxy_count;
							grunt.verbose.writeln('Resp [' + pstatus + '] for proxy creation ' + this.url + ' -> ' + body);
						}
					}.bind({ url: proxy_import_url }),
						function (req) {
							let form = req.form();
							form.append('file', fs.createReadStream(this.package_path));
						}.bind({ package_path: path.join(filepath, proxy_file_package) }));
				}
			}.bind({ url: proxy_details_url, proxy_name: name }));
		});

		waitForCompletion(function () {
			if (files.length <= 0) {
				grunt.log.ok("No proxies found");
			}
			else {
				if (proxy_count) {
					grunt.log.ok(`Imported  ${proxy_count} proxies`);
				}
				if (proxy_err_count) {
					grunt.log.error(`Failed to import ${proxy_err_count} proxies`);
				}
			}

			done();
		});
	});

	grunt.registerMultiTask('deleteProxies', 'Delete all proxies from org ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let proxy_count = 0;
		let proxy_err_count = 0;
		let files = this.filesSrc;
		let done = this.async();

		const { waitForDelete, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		url = url + "/v1/organizations/" + org + "/apis/";

		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts, f);
		}

		files.forEach(function (filepath) {
			let proxy = path.basename(filepath);
			let app_del_url = url + encodeURIComponent(proxy);

			waitForDelete(app_del_url, function (error, response, body) {
				let pstatus = 999;
				if (response && response.statusCode)
					pstatus = response.statusCode;

				if (!error && response.statusCode == 200) {
					++proxy_count;
				} else {
					++proxy_err_count;
					grunt.log.error('ERROR Resp [' + pstatus + '] for proxy deletion ' + this.app_del_url + ' -> ' + body);

					if (error) {
						grunt.log.error(error);
					}
				}
			}.bind({ app_del_url: app_del_url }));
		});

		waitForCompletion(function () {
			if (files.length <= 0) {
				grunt.log.ok("No proxies found");
			}
			else {
				if (proxy_count) {
					grunt.log.ok(`Deleted  ${proxy_count} proxies`);
				}
				if (proxy_err_count) {
					grunt.log.error(`Failed to delete ${proxy_err_count} proxies`);
				}
			}

			done();
		});
	});


	grunt.registerTask('deployProxies', 'Deploy latest revision of all proxies for org ' + apigee.to.org + " environment " + apigee.to.env + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let env = apigee.to.env;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let proxies = [];
		let proxy_count = 0;
		let proxy_err_count = 0;
		let done = this.async();

		const { waitForGet, waitForPost, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		url = url + "/v1/organizations/" + org;
		let proxies_url = url + "/apis";

		// Get proxy list
		waitForGet(proxies_url, function (error, response, body) {
			let lstatus = 999;
			if (response && response.statusCode)
				lstatus = response.statusCode;

			if (!error && lstatus == 200) {
				proxies = JSON.parse(body);

				for (let i = 0; i < proxies.length; i++) {
					// Get proxy details
					let proxy_url = proxies_url + "/" + encodeURIComponent(proxies[i]);
					waitForGet(proxy_url, function (error, response, body) {
						let pstatus = 999;
						if (response && response.statusCode)
							pstatus = response.statusCode;

						if (!error && pstatus == 200) {
							// Get maximum revision for this proxy
							let proxy_details = JSON.parse(body);
							let deploy_rev = 1;
							if (proxy_details.revision && proxy_details.revision.length > 0) {
								deploy_rev = proxy_details.revision[proxy_details.revision.length - 1];
							}

							let deploy_url = url + "/environments/" + env + "/apis/" + encodeURIComponent(this.proxy) + "/revisions/" + deploy_rev + "/deployments?override=true";

							grunt.verbose.writeln(`Deploying proxy ${this.proxy} version ${deploy_rev}: ${deploy_url}`);

							// Deploy the proxy
							waitForPost(deploy_url, {}, function (error, response, body) {
								let dstatus = 999;
								if (response && response.statusCode)
									dstatus = response.statusCode;

								if (!error && dstatus == 200) {
									++proxy_count;
									grunt.verbose.writeln('Resp [' + dstatus + '] for proxy deployment ' + this.url + ' -> ' + body);
								}
								else {
									++proxy_err_count;
									grunt.log.error('ERROR Resp [' + dstatus + '] for proxy deployment ' + this.url + ' -> ' + body);

									if (error) {
										grunt.log.error(error);
									}
								}
							}.bind({ url: deploy_url, proxy: this.proxy }));
						}
						else {
							// Failed to get proxy details
							++proxy_err_count;
							grunt.log.error('ERROR Resp [' + pstatus + '] for proxy details ' + this.url + ' -> ' + body);

							if (error) {
								grunt.log.error(error);
							}
						}
					}.bind({ url: proxy_url, proxy: proxies[i] }));
				};

			}
			else {
				// Failed to get proxy list
				grunt.log.error('Resp [' + lstatus + '] for proxy list ' + this.url + ' -> ' + body);

				if (error) {
					grunt.log.error(error);
				}
			}
		}.bind({ url: proxies_url }));

		waitForCompletion(function () {
			if (proxies.length <= 0) {
				grunt.log.ok("No proxies found");
			}
			else {
				if (proxy_count) {
					grunt.log.ok(`Deployed  ${proxy_count} proxies`);
				}
				if (proxy_err_count) {
					grunt.log.error(`Failed to deploy ${proxy_err_count} proxies`);
				}
			}

			done();
		});
	});

	grunt.registerTask('undeployProxies', 'UnDeploy all proxies for org ' + apigee.to.org + " environment " + apigee.to.env + " [" + apigee.to.version + "]", function () {
		const keep_latest = grunt.option("keep-latest");
		let url = apigee.to.url;
		let org = apigee.to.org;
		let env = apigee.to.env;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let deployment_count = 0;
		let deployment_keep_count = 0;
		let proxy_count = 0;
		let proxy_err_count = 0;
		let done = this.async();

		const { waitForGet, waitForDelete, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		url = url + "/v1/organizations/" + org;
		let deployments_url = url + "/environments/" + env + "/deployments";

		// Get deployed proxy list
		waitForGet(deployments_url, function (error, response, body) {
			let lstatus = 999;
			if (response && response.statusCode)
				lstatus = response.statusCode;

			if (!error && lstatus == 200) {
				const deployments = JSON.parse(body);

				for (let proxy of deployments.aPIProxy) {
					let keep_rev = 0;
					if (keep_latest) {
						for (let revision of proxy.revision) {
							let rev = Number.parseInt(revision.name);
							keep_rev = Math.max(rev, keep_rev);
						}
					}

					for (let revision of proxy.revision) {
						const proxy_url = url + "/environments/" + env + "/apis/" + encodeURIComponent(proxy.name) + "/revisions/" + revision.name + "/deployments";

						if (revision.name == keep_rev) {
							++deployment_keep_count;
							grunt.verbose.writeln(`Preserving ${proxy.name} version ${revision.name}`);
							continue;
						}

						++deployment_count;
						grunt.verbose.writeln(`Undeploying ${proxy.name} version ${revision.name}`);

						waitForDelete(proxy_url, function (error, response, body) {
							let dstatus = 999;
							if (response && response.statusCode)
								dstatus = response.statusCode;

							if (!error && dstatus == 200) {
								++proxy_count;
								grunt.verbose.writeln('Resp [' + dstatus + '] for proxy undeployment ' + this.proxy_url + ' -> ' + body);
							}
							else {
								++proxy_err_count;
								grunt.log.error('ERROR Resp [' + dstatus + '] for proxy undeployment ' + this.proxy_url + ' -> ' + body);

								if (error) {
									grunt.log.error(error);
								}
							}
						}.bind({ proxy_url: proxy_url }));
					}
				}
			}
			else {
				// Failed to get deployment list
				grunt.log.error('Resp [' + lstatus + '] for deployment list ' + this.url + ' -> ' + body);

				if (error) {
					grunt.log.error(error);
				}
			}
		}.bind({ url: deployments_url }));

		waitForCompletion(function () {
			if (deployment_count <= 0) {
				grunt.log.ok("No deployed proxies found");
			}
			else {
				if (proxy_count) {
					grunt.log.ok(`Undeployed ${proxy_count} revisions of ${deployment_count} proxies`);
				}
				if (deployment_keep_count) {
					grunt.log.ok(`Preserved ${deployment_keep_count} proxy revisions`);
				}
				if (proxy_err_count) {
					grunt.log.error(`Failed to undeploy ${proxy_err_count} proxy revisions`);
				}
			}

			done();
		});
	});

};
