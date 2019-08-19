/*jslint node: true */
var request = require('request');
var apigee = require('../config.js');
var flow_hook_config = {};
var flow_hook_type = ["PreProxyFlowHook", "PostProxyFlowHook", "PreTargetFlowHook", "PostTargetFlowHook"];
var configured_flow_hooks;
module.exports = function(grunt) {
	'use strict';
	grunt.registerTask('exportFlowHooks', 'Export all configured flow hooks from org ' + apigee.from.org + " [" + apigee.from.version + "]", function() {
		var base_url = apigee.from.url;
		var org = apigee.from.org;
		var env = apigee.from.env;
		var userid = apigee.from.userid;
		var passwd = apigee.from.passwd;
		var fs = require('fs');
		var done_count = 0;
		var done = this.async();

		grunt.verbose.writeln("========================= export Flow Hooks ===========================" );

		for (var i = 0; i < flow_hook_type.length; i++) {
			var url = base_url + "/v1/organizations/" + org + "/environments/" + env + "/flowhooks/" + flow_hook_type[i];
			grunt.verbose.writeln("Getting flow hook (Type: ", flow_hook_type[i], ")..." + url + "\n");
			request(url, function(error, response, body) {
				if (!error && response.statusCode == 200) {
					grunt.verbose.writeln("Processing response for flow hook type: " + this.cur_flow_hook_type + " ...\n")
					var flow_hook_detail = JSON.parse(body);
					grunt.verbose.writeln("flow_hook_detail = " + JSON.stringify(flow_hook_detail) + "\n");
					var shared_flow_name = ("sharedFlow" in flow_hook_detail) ? flow_hook_detail.sharedFlow : "";
					flow_hook_config[this.cur_flow_hook_type] = shared_flow_name;

				} else {
					grunt.verbose.writeln(error);
					grunt.log.error(error);
				}
				done_count++;
				if (done_count == flow_hook_type.length) {
					// Write the configuration file
					var flow_hook_file = grunt.config.get("exportFlowHooks.dest.data");
					grunt.verbose.writeln("About to write to file: " + flow_hook_file + " - Contents: " + JSON.stringify(flow_hook_config) + "\n");
					grunt.file.write(flow_hook_file, JSON.stringify(flow_hook_config));
					grunt.log.ok('Found ' + done_count + ' flow hooks. Configuration exported');
                    grunt.verbose.writeln("================== export flow_hook DONE()" );
					done();
				}
			}.bind({
				cur_flow_hook_type: flow_hook_type[i]
			})).auth(userid, passwd, true);
		}
		/*
		setTimeout(function() {
		    grunt.verbose.writeln("================== Flow Hooks Timeout done" );
		    done(true);
		}, 3000);
		grunt.verbose.writeln("========================= export Flow Hooks DONE ===========================" );
		*/

	});

	grunt.registerMultiTask('importFlowHooks', 'Import all configured flow hooks to org ' +
		apigee.to.org + " [" + apigee.to.version + "]",
		function() {
			var url = apigee.to.url;
			var org = apigee.to.org;
			var env = apigee.to.env;
			var userid = apigee.to.userid;
			var passwd = apigee.to.passwd;
			var done_count = 0;
			var base_url = url + "/v1/organizations/" + org + "/environments/" + env + "/flowhooks";
			// Read flow hook config file
			var flow_hook_file = grunt.config.get("exportFlowHooks.dest.data");
			flow_hook_config = grunt.file.readJSON(flow_hook_file);
			grunt.verbose.writeln("Read flow hook config file contents: " + JSON.stringify(flow_hook_config) + "\n");
			for (var i = 0; i < flow_hook_type.length; i++) {
				var cur_flow_hook = flow_hook_type[i];
				var cur_shared_flow = flow_hook_config[cur_flow_hook];
				var cur_url = base_url + "/" + cur_flow_hook;
				if (cur_shared_flow != "") {
					// Attach shared flow to flow hook
					grunt.verbose.writeln("Attaching " + cur_shared_flow + " shared flow to " + cur_flow_hook + "\n");
					var request_data = {};
					request_data['sharedFlow'] = cur_shared_flow;
					grunt.verbose.writeln("Request data = " + JSON.stringify(request_data) + "\n");
					var req = request.post(cur_url, {
						json: true,
						body: request_data
					}, function(err, resp, body) {
						if (err) {
							grunt.verbose.log(err);
						} else {
							grunt.verbose.writeln('Resp [' + resp.statusCode + '] for flow hook attachment:  ' + this.url + ' -> ' + JSON.stringify(body) + "\n");
						}
						done_count++;
						if (done_count == flow_hook_type.length) {
							grunt.log.ok('Processed ' + done_count + ' flow hooks');
							done();
						}
					}.bind({
						url: cur_url
					})).auth(userid, passwd, true);
				} else {
					// Delete shared flow if any configured
					grunt.verbose.writeln("Removing any attached shared flow to " + cur_flow_hook + "\n");
					// grunt.verbose.writeln("Url = " + cur_url + "\n");
					var req = request.del(cur_url, function(err, resp, body) {
						if (err) {
							grunt.verbose.log(err);
						} else {
							grunt.verbose.writeln('Resp [' + resp.statusCode + '] for flow hook delete attachment:  ' + this.url + ' -> ' + body + "\n");
						}
						done_count++;
						if (done_count == flow_hook_type.length) {
							grunt.log.ok('Processed ' + done_count + ' flow hooks');
							done();
						}
					}.bind({
						url: cur_url
					})).auth(userid, passwd, true);
				}
			}
			var done = this.async();
		});

	grunt.registerTask('deleteFlowHooks', 'Detach any configured flow hooks from org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var env = apigee.to.env;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var done_count = 0;
		var base_url = url + "/v1/organizations/" + org + "/environments/" + env + "/flowhooks";
		for (var i = 0; i < flow_hook_type.length; i++) {
			var cur_flow_hook = flow_hook_type[i];
			var cur_url = base_url + "/" + cur_flow_hook;
			// Delete shared flow 
			grunt.verbose.writeln("Removing any attached shared flow to " + cur_flow_hook + "\n");
			var req = request.del(cur_url, function(err, resp, body) {
				if (err) {
					grunt.verbose.log(err);
				} else {
					grunt.verbose.writeln('Resp [' + resp.statusCode + '] for flow hook delete attachment:  ' + this.url + ' -> ' + body + "\n");
				}
				done_count++;
				if (done_count == flow_hook_type.length) {
					grunt.log.ok('Processed ' + done_count + ' flow hooks');
					done();
				}
			}.bind({
				url: cur_url
			})).auth(userid, passwd, true);
		}
		var done = this.async();
	});

};
