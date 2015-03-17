/*jslint node: true */
var request = require('request');
var apigee = require('../config.js');
var devs;
module.exports = function(grunt) {
	'use strict';
	grunt.registerTask('exportDevs', 'Export all developers from org ' + apigee.from.org + " [" + apigee.from.version + "]", function() {
		var url = apigee.from.url;
		var org = apigee.from.org;
		var userid = apigee.from.userid;
		var passwd = apigee.from.passwd;
		var filepath = grunt.config.get("exportDevs.dest.data");
		var done_count =0;

		grunt.verbose.write("getting developers..." + url);
		url = url + "/v1/organizations/" + org + "/developers";

		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
			    devs =  JSON.parse(body);
			   
			    
			    for (var i = 0; i < devs.length; i++) {
			    	var dev_url = url + "/" + devs[i];
			    	grunt.file.mkdir(filepath);

			    	//Call developer details
					request(dev_url, function (error, response, body) {
						if (!error && response.statusCode == 200) {
							grunt.verbose.write(body);
						    var dev_detail =  JSON.parse(body);
						    var dev_file = filepath + "/" + dev_detail.email;
						    grunt.file.write(dev_file, body);
						}
						else
						{
							grunt.log.error(error);
						}
						done_count++;
						if (done_count == devs.length)
						{
							grunt.log.ok('Exported ' + done_count + ' developers');
							done();
						}
					}).auth(userid, passwd, true);
			    	// End Developer details
			    };
			    
			} 
			else
			{
				grunt.log.error(error);
			}
		}).auth(userid, passwd, true);
		var done = this.async();
	});


	grunt.registerMultiTask('importDevs', 'Import all developers to org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var done_count = 0;
		var files;
		url = url + "/v1/organizations/" + org + "/developers";
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
			grunt.verbose.writeln('Resp [' + status + '] for dev creation ' + this.url + ' -> ' + body);
			if (error || status!=201)
			  	grunt.verbose.error('ERROR Resp [' + status + '] for dev creation ' + this.url + ' -> ' + body); 
			done_count++;
			if (done_count == files.length)
			{
				grunt.log.ok('Imported ' + done_count + ' developers');
				done();
			}

			}.bind( {url: url}) ).auth(userid, passwd, true);

		});
	});

	grunt.registerMultiTask('deleteDevs', 'Delete all developers from org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
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
		url = url + "/v1/organizations/" + org + "/developers/";
		var done = this.async();
		files.forEach(function(filepath) {
			var content = grunt.file.read(filepath);
			var dev = JSON.parse(content);
			var del_url = url + dev.email;
			grunt.verbose.write(del_url);	
			request.del(del_url, function(error, response, body){
			  var status = 999;
			  if (response)	
				status = response.statusCode;
			  grunt.verbose.writeln('Resp [' + status + '] for dev deletion ' + this.del_url + ' -> ' + body);
			  if (error || status!=200)
			  { 
			  	grunt.verbose.error('ERROR Resp [' + status + '] for dev deletion ' + this.del_url + ' -> ' + body); 
			  }
			  done_count++;
			  if (done_count == files.length)
			  {
				grunt.log.ok('Processed ' + done_count + ' developers');
				done();
			  }
			}.bind( {del_url: del_url}) ).auth(userid, passwd, true);

		});
	});
};