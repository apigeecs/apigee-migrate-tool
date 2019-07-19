/*jslint node: true */
var request = require('request');
var apigee = require('../config.js');
var reports;
module.exports = function(grunt) {
	'use strict';
	grunt.registerTask('exportReports', 'Export all reports from org ' + apigee.from.org + " [" + apigee.from.version + "]", function() {
		var url = apigee.from.url;
		var org = apigee.from.org;
		var userid = apigee.from.userid;
		var passwd = apigee.from.passwd;
		var filepath = grunt.config.get("exportReports.dest.data");
		var done_count =0;
		var done = this.async();

		grunt.verbose.writeln("========================= export Reports ===========================" );
		grunt.verbose.writeln("getting reports..." + url);
		url = url + "/v1/organizations/" + org + "/reports?expand=true";

		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				grunt.verbose.writeln(body);
		    reports =  JSON.parse(body).qualifier;

			grunt.file.mkdir(filepath);
		    for (var i = 0; i < reports.length; i++) {
		    	var dev_url = url + "/" + reports[i];

					var report_file = filepath + "/" + reports[i].name;
					grunt.file.write(report_file, JSON.stringify(reports[i]));

					done_count++;
					if (done_count == reports.length)
					{
						grunt.log.ok('Exported ' + done_count + ' reports');
                        grunt.verbose.writeln("================== export reports DONE()" );
						done();
					}
				}
			}
			else
			{
				grunt.log.error(error);
			}
		}).auth(userid, passwd, true);
		/*
		setTimeout(function() {
		    grunt.verbose.writeln("================== Reports Timeout done" );
		    done(true);
		}, 3000);
		grunt.verbose.writeln("========================= export Reports DONE ===========================" );
		*/
	});

	grunt.registerMultiTask('importReports', 'Import all reports to org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var done_count = 0;
		var files;
		url = url + "/v1/organizations/" + org + "/reports";
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

		files.forEach( function(filepath) {
			console.log(filepath);
			var content = grunt.file.read(filepath);
			grunt.verbose.writeln(url);
			request.post({
			  headers: {'Content-Type' : 'application/json'},
			  url:     url,
			  body:    content
			}, function(error, response, body){
			var status = 999;
			if (response)
			 status = response.statusCode;
			grunt.verbose.writeln('Resp [' + status + '] for report creation ' + this.url + ' -> ' + body);
			if (error || status!=201)
			  	grunt.verbose.error('ERROR Resp [' + status + '] for report creation ' + this.url + ' -> ' + body);
			done_count++;
			if (done_count == files.length)
			{
				grunt.log.ok('Imported ' + done_count + ' reports');
				done();
			}

			}.bind( {url: url}) ).auth(userid, passwd, true);
		});
	});

	grunt.registerMultiTask('deleteReports', 'Delete all reports from org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
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
		url = url + "/v1/organizations/" + org + "/reports/";
		var done = this.async();
		files.forEach(function(filepath) {
			var content = grunt.file.read(filepath);
			var report = JSON.parse(content);
			var del_url = url + report.name;
			grunt.verbose.writeln(del_url);
			request.del(del_url, function(error, response, body){
			  var status = 999;
			  if (response)
				status = response.statusCode;
			  grunt.verbose.writeln('Resp [' + status + '] for report deletion ' + this.del_url + ' -> ' + body);
			  if (error || status!=200)
			  {
			  	grunt.verbose.error('ERROR Resp [' + status + '] for report deletion ' + this.del_url + ' -> ' + body);
			  }
			  done_count++;
			  if (done_count == files.length)
			  {
				grunt.log.ok('Processed ' + done_count + ' reports');
				done();
			  }
			}.bind( {del_url: del_url}) ).auth(userid, passwd, true);

		});
	});









};
