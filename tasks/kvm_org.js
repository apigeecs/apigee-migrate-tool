/*jslint node: true */
var request = require('request');
var apigee = require('../config.js');
var kvms;
module.exports = function(grunt) {
	'use strict';
	grunt.registerTask('exportOrgKVM', 'Export all org-kvm from org ' + apigee.from.org + " [" + apigee.from.version + "]", function() {
		var url = apigee.from.url;
		var org = apigee.from.org;
		var userid = apigee.from.userid;
		var passwd = apigee.from.passwd;
		var filepath = grunt.config.get("exportOrgKVM.dest.data");
		var done_count =0;

		url = url + "/v1/organizations/" + org + "/keyvaluemaps";
		grunt.verbose.write("getting Org kvm ..." + url);
		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				//grunt.verbose.write(body);
			    kvms =  JSON.parse(body);   
			    
			    for (var i = 0; i < kvms.length; i++) {
			    	var org_kvm_url = url + "/" + kvms[i];
			    	grunt.file.mkdir(filepath);

			    	//Call kvm details
					request(org_kvm_url, function (error, response, body) {
						if (!error && response.statusCode == 200) {
							grunt.verbose.write(body);
						    var kvm_detail =  JSON.parse(body);
						    var kvm_file = filepath + "/" + kvm_detail.name;
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
							done();
						}
					}).auth(userid, passwd, true);
			    	// End kvm details
			    };
			    
			} 
			else
			{
				grunt.log.error(error);
			}
		}).auth(userid, passwd, true);
		var done = this.async();
	});


	grunt.registerMultiTask('importOrgKVM', 'Import all org-kvm to org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var done_count = 0;
		var files;
		url = url + "/v1/organizations/" + org + "/keyvaluemaps";
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
		files.forEach(function(filepath) {
			console.log(filepath);
			var content = grunt.file.read(filepath);
			grunt.verbose.write(url);	
			request.post({
			  headers: {'Content-Type' : 'application/json'},
			  url:     url,
			  body:    content
			}, function(error, response, body){
			var status = 999;
			if (response)	
			 status = response.statusCode;
			grunt.verbose.writeln('Resp [' + status + '] for org-kvm creation ' + this.url + ' -> ' + body);
			if (error || status!=201)
			  	grunt.verbose.error('ERROR Resp [' + status + '] for org-kvm creation ' + this.url + ' -> ' + body); 
			done_count++;
			if (done_count == files.length)
			{
				grunt.log.ok('Imported ' + done_count + ' org-kvms');
				done();
			}

			}.bind( {url: url}) ).auth(userid, passwd, true);

		});
	});


	grunt.registerMultiTask('deleteOrgKVM', 'Delete all org-kvm from org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var done_count = 0;
		var files = this.filesSrc;
		var opts = {flatten: false};
		var f = grunt.option('src');
		if (f)
		{
			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts,f);
		}
		url = url + "/v1/organizations/" + org + "/keyvaluemaps/";
		var done = this.async();
		files.forEach(function(filepath) {
			var content = grunt.file.read(filepath);
			var kvm = JSON.parse(content);
			var del_url = url + kvm.name;
			grunt.verbose.write(del_url);	
			request.del(del_url, function(error, response, body){
			  var status = 999;
			  if (response)	
				status = response.statusCode;
			  grunt.verbose.writeln('Resp [' + status + '] for kvm deletion ' + this.del_url + ' -> ' + body);
			  if (error || status!=200)
			  { 
			  	grunt.verbose.error('ERROR Resp [' + status + '] for kvm deletion ' + this.del_url + ' -> ' + body); 
			  }
			  done_count++;
			  if (done_count == files.length)
			  {
				grunt.log.ok('Processed ' + done_count + ' kvms');
				done();
			  }
			}.bind( {del_url: del_url}) ).auth(userid, passwd, true);

		});
	});
};