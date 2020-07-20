/*jslint node: true */
var request = require('request');
var apigee = require('../config.js');
var async = require('async');
var kvms;
module.exports = function(grunt) {
	'use strict';
	grunt.registerTask('exportEnvKVM', 'Export all env-kvm from org ' + apigee.from.org + " environment " + apigee.from.env + " [" + apigee.from.version + "]", function() {
		var url = apigee.from.url;
		var org = apigee.from.org;
		var env = apigee.from.env;
		var userid = apigee.from.userid;
		var passwd = apigee.from.passwd;
		var filepath = grunt.config.get("exportEnvKVM.dest.data");
		var done_count =0;
		var done = this.async();
		grunt.verbose.writeln("========================= export Env KVMs ===========================" );
		grunt.file.mkdir(filepath);
        
		var env_url = url + "/v1/organizations/" + org + "/environments/" + env + "/keyvaluemaps";

		grunt.verbose.writeln("Env KVM URL: " + env_url);

		request(env_url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				grunt.verbose.writeln(body);
				kvms =  JSON.parse(body);
				for (var i = 0; i < kvms.length; i++) {
					var env_kvm_url = this.env_url + "/" + kvms[i];
					grunt.verbose.writeln("KVM URL : " + env_kvm_url);
					var env = this.env;

					//Call kvm details
					request(env_kvm_url, function (error, response, body) {
						if (!error && response.statusCode == 200) {
							grunt.verbose.writeln(body);
							var kvm_detail =  JSON.parse(body);
							var kvm_file = filepath + "/" + this.env + "/" + kvm_detail.name;
							grunt.file.write(kvm_file, body);
						}
						else
						{
							grunt.log.error(error);
						}
						done_count++;
						if (done_count == kvms.length)
						{
							grunt.log.ok('Exported ' + done_count + ' kvms');
							grunt.verbose.writeln("================== export ENV KVM DONE()" );
							done();
						}
					}.bind( {env: env})).auth(userid, passwd, true);
					// End kvm details
				};
			}
			else
			{
				grunt.log.error(error);
			}
		}.bind( {env_url: env_url, env: env})).auth(userid, passwd, true);
		/*
		setTimeout(function() {
		    grunt.verbose.writeln("================== ENV KVMs Timeout done" );
		    done(true);
		}, 3000);
		grunt.verbose.writeln("========================= export Env KVMs DONE ===========================" );
		*/
	});

	grunt.registerMultiTask('importEnvKVM', 'Import all env-kvm to org ' + apigee.to.org + " environment " + apigee.to.env + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var env = apigee.to.env;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var done_count =0;
		var files;
		url = url + "/v1/organizations/" + org + "/";
		var done = this.async();
		var opts = {flatten: false};
		var f = grunt.option('src');
		if (f)
		{
			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts,f);
		}
		else
		{
			files = this.filesSrc;
		}

		async.eachSeries(files, function (filepath,callback) {
			var folders = filepath.split("/");
			var input_env = folders[folders.length - 2];
			if( input_env !== env ) {
				grunt.verbose.writeln("Skipping: " + filepath);
				done_count++;
				callback();
			}
			else {
				var content = grunt.file.read(filepath);
				var kvm = JSON.parse(content);
				grunt.verbose.writeln("Creating KVM : " + kvm.name + " under env " + env);
				grunt.verbose.writeln(JSON.stringify(kvm));
				var kvm_url = url + "environments/" + env + "/keyvaluemaps";
				grunt.verbose.writeln("Creating kvm " + kvm_url);

				request.post({
				  headers: {'Content-Type' : 'application/json'},
				  url:     kvm_url,
				  body:    JSON.stringify(kvm)
				}, function(error, response, body){
					try{
					  done_count++;
					  var cstatus = 999;
					  if (response)
						cstatus = response.statusCode;
					  if (cstatus == 200 || cstatus == 201)
					  {
					  grunt.verbose.writeln('Resp [' + response.statusCode + '] for create kvm  ' + this.kvm_url + ' -> ' + body);
					  var kvm_resp = JSON.parse(body);
					  if (done_count == files.length)
						{
							grunt.log.ok('Processed ' + done_count + ' kvms');
							done();
						}
						callback();
					  }
					  else
					  {
						grunt.verbose.writeln('ERROR Resp [' + response.statusCode + '] for create kvm  ' + this.kvm_url + ' -> ' + body);
						callback();
					  }
					}
					catch(err)
					{
						grunt.log.error("ERROR - from kvm URL : " + kvm_url );
						grunt.log.error(body);
					}

				}.bind( {kvm_url: kvm_url}) ).auth(userid, passwd, true);
			}
		});
		//var done = this.async();
	});


	grunt.registerMultiTask('deleteEnvKVM', 'Delete all env-kvm from org ' + apigee.to.org + " environment " + apigee.to.env + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var env = apigee.to.env;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var done_count =0;
		var files;
		url = url + "/v1/organizations/" + org + "/";
		var done = this.async();
		var opts = {flatten: false};
		var f = grunt.option('src');
		if (f)
		{
			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts,f);
		}
		else
		{
			files = this.filesSrc;
		}
		var done = this.async();
		files.forEach(function(filepath) {
			grunt.verbose.writeln("processing file " + filepath);
			var folders = filepath.split("/");
			var input_env = folders[folders.length - 2];
			if( input_env !== env ) {
				grunt.verbose.writeln("Skipping: " + filepath);
				done_count++;
			}
			else {
				var content = grunt.file.read(filepath);
				var kvm = JSON.parse(content);
				var kvm_del_url = url + "environments/" + env + "/keyvaluemaps/" + kvm.name;
				grunt.verbose.writeln(kvm_del_url);
				request.del(kvm_del_url,function(error, response, body){
				   var status = 999;
				   if (response)
				    status = response.statusCode;
				  grunt.verbose.writeln('Resp [' + status + '] for delete kvm ' + this.kvm_del_url + ' -> ' + body);
				  done_count++;
				  if (error || status!=200)
					grunt.verbose.error('ERROR Resp [' + status + '] for delete kvm ' + this.kvm_del_url + ' -> ' + body);
				  if (done_count == files.length)
				  {
					grunt.log.ok('Processed ' + done_count + ' kvms');
					done();
				  }
				}.bind( {kvm_del_url: kvm_del_url}) ).auth(userid, passwd, true);
			}
		});

	});

};
