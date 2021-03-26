/*jslint node: true */
'use strict';

const path = require('path');
const apigee = require('../config.js');
const asyncrequest = require('../util/asyncrequest.lib.js');


module.exports = function (grunt) {
	grunt.registerTask('exportVirtualHosts', 'Export all virtual hosts from org ' + apigee.from.org + ' environment ' + apigee.from.env + " [" + apigee.from.version + "]", function () {
		let url = apigee.from.url;
		let org = apigee.from.org;
		let env = apigee.from.env;
		let userid = apigee.from.userid;
		let passwd = apigee.from.passwd;
		let filepath = grunt.config.get("exportVirtualHosts.dest.data");
		let vhosts = [];
		let done = this.async();

		const { waitForGet, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		grunt.verbose.writeln("========================= export Virtual Hosts ===========================");

		// Get virtual host list
		grunt.verbose.writeln("getting virtual hosts..." + url);
		url = url + "/v1/organizations/" + org + "/environments/" + env + "/virtualhosts";

		waitForGet(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				grunt.log.write("VIRTUALHOSTS: " + body);
				vhosts = JSON.parse(body);

				grunt.file.mkdir(filepath);

				for (let i = 0; i < vhosts.length; i++) {
					let vhost_url = url + "/" + vhosts[i];
					let vhost_path = path.join(filepath, vhosts[i]);

					// Get virtual host details
					grunt.verbose.writeln("VIRTUAL HOST URL: " + vhost_url.length + " " + vhost_url);
					waitForGet(vhost_url, function (error, response, body) {
						if (!error && response.statusCode == 200) {
							grunt.verbose.writeln("VIRTUAL HOST " + body);
							let vhost_detail = JSON.parse(body);

							grunt.file.write(vhost_path, body);

							grunt.verbose.writeln('Exported virtual host ' + vhost_detail.name);
						}
						else {
							grunt.log.error('Error ' + response.statusCode + ' exporting Virtual Host from ' + vhost_url);
							if (error) {
								grunt.log.error(error);
							}
						}
					});

					// End virtual host details
				};
			}
			else {
				grunt.log.error(error);
			}
		});

		waitForCompletion(function () {
			if (vhosts.length <= 0) {
				grunt.verbose.writeln("No Virtual Hosts");
			}
			else {
				grunt.log.ok('Processed ' + vhosts.length + ' virtual hosts');
			}
			grunt.verbose.writeln("================== export virtual hosts DONE()");

			done();
		});
	});

	grunt.registerMultiTask('importVirtualHosts', 'Import all virtual hosts to org ' + apigee.to.org + ' environment ' + apigee.to.env + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let env = apigee.to.env;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let vhosts = this.filesSrc;
		let done = this.async();

		const { waitForPost, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		grunt.verbose.writeln("========================= import Virtual Hosts ===========================");

		// Build source list
		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			vhosts = grunt.file.expand(opts, f);
		}

		url = url + "/v1/organizations/" + org + "/environments/" + env + "/virtualhosts";

		// Create virtual hosts
		vhosts.forEach(function (vhostPath) {
			let vhostName = path.basename(vhostPath);

			let content = grunt.file.read(vhostPath);

			grunt.verbose.writeln("Creating virtual host " + vhostName);
			waitForPost(url, {
				headers: { 'content-type': 'application/json' },
				body: content
			}, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;

				if (!error && status == 201) {
					grunt.verbose.writeln('Resp [' + status + '] for virtual host creation ' + this.url + ' -> ' + body);
					grunt.verbose.writeln('Created virtual host ' + this.vhostName);
				}
				else {
					grunt.log.error('ERROR Resp [' + status + '] for virtual host creation ' + this.vhostName + ' -> ' + body);
					if (error) {
						grunt.log.error(error);
					}
				}
			}.bind({ url: url, vhostName: vhostName }));
		});

		waitForCompletion(function () {
			if (vhosts.length <= 0) {
				grunt.verbose.writeln("No virtual hosts");
			}
			else {
				grunt.log.ok('Processed ' + vhosts.length + ' virtual hosts');
			}
			grunt.verbose.writeln("================== import virtual hosts DONE()");

			done();
		});
	});

	grunt.registerMultiTask('deleteVirtualHosts', 'Delete all virtual hosts from org ' + apigee.to.org + ' environment ' + apigee.to.env + " [" + apigee.to.version + "]", function () {
		let url = apigee.to.url;
		let org = apigee.to.org;
		let env = apigee.to.env;
		let userid = apigee.to.userid;
		let passwd = apigee.to.passwd;
		let vhosts = this.filesSrc;
		let done = this.async();

		const { waitForDelete, waitForCompletion } = asyncrequest(grunt, userid, passwd);

		grunt.verbose.writeln("========================= delete Virtual Hosts ===========================");

		// Build virtual host list
		let f = grunt.option('src');
		if (f) {
			let opts = { flatten: false };

			grunt.verbose.writeln('src pattern = ' + f);
			vhosts = grunt.file.expand(opts, f);
		}

		url = url + "/v1/organizations/" + org + "/environments/" + env + "/virtualhosts";

		// Delete virtual hosts
		vhosts.forEach(function (vhostPath) {
			let vhostName = path.basename(vhostPath);

			let del_url = url + "/" + vhostName;
			waitForDelete(del_url, function (error, response, body) {
				let status = 999;
				if (response)
					status = response.statusCode;

				if (!error && status == 200) {
					grunt.verbose.writeln('Resp [' + status + '] for virtual host deletion ' + this.url + ' -> ' + body);
					grunt.verbose.writeln('Deleted virtual host ' + this.vhostName);
				}
				else {
					grunt.log.error('ERROR Resp [' + status + '] for virtuak host deletion ' + this.vhostName + ' -> ' + body);
					if (error) {
						grunt.log.error(error);
					}
				}
			}.bind({ url: del_url, vhostName: vhostName }));
		});

		waitForCompletion(function () {
			if (vhosts.length <= 0) {
				grunt.verbose.writeln("No Virtual Hosts");
			}
			else {
				grunt.log.ok('Deleted ' + vhosts.length + ' virtual hosts');
			}
			grunt.verbose.writeln("================== delete virtual hosts DONE()");

			done();
		});
	});
};
