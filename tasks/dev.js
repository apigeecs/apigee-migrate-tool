/*jslint node: true */
var request = require('request');
var apigee = require('../config.js');
var async = require('async');
var devs;
module.exports = function(grunt) {
	'use strict';
	grunt.registerTask('exportDevs', 'Export all developers from org ' + apigee.from.org + " [" + apigee.from.version + "]", function() {
		var url = apigee.from.url;
		var org = apigee.from.org;
		var userid = apigee.from.userid;
		var passwd = apigee.from.passwd;
		var filepath = grunt.config.get("exportDevs.dest.data");
		var dev_count =0;
		var done_count = 0;

		grunt.verbose.write("getting developers..." + url);
		url = url + "/v1/organizations/" + org + "/developers";

		var dumpDeveloper = function(email) {
			var dev_url = url + "/" + email;
			grunt.verbose.write("getting developer " + dev_url);

			//Call developer details
			request(dev_url, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					grunt.verbose.write(body);
					var dev_detail = JSON.parse(body);
					var dev_file = filepath + "/" + dev_detail.email;
					grunt.file.write(dev_file, body);
					done_count++;
				}
				else {
					if (error)
						grunt.log.error(error);
					else
						grunt.log.error(body);
				}

			}.bind( {dev_url: dev_url}) ).auth(userid, passwd, true);
		}

		var iterateOverDevs = function(start, base_url, callback) {
			var url = base_url;

			if (start) {
				url += "?startKey=" + encodeURIComponent(start);
			}
			grunt.verbose.write("getting developers..." + url);

			request(url, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					devs = JSON.parse(body);
					var last = null;

					// detect that the only developer returned is the one we asked to start with; that's the end game.
					if (devs.length == 1 && devs[0] == start) {
						grunt.log.ok('Retrieved total of ' + dev_count + ' developers');

						//callback(all_devs);

					} else {
						dev_count += devs.length;

						for (var i = 0; i < devs.length; i++) {
							// If there was a 'start', don't do it again, because it was processed in the previous callback.
							if (!start || devs[i] != start) {
								callback(devs[i]);
								last = devs[i];
							}
						}

						grunt.log.ok('Retrieved ' + devs.length + ' developers');

						// Keep on calling getDevs() as long as we're getting new developers back
						iterateOverDevs(last, base_url, callback);
					}
				}
				else {
					if (error)
						grunt.log.error(error);
					else
						grunt.log.error(body);
				}

			}).auth(userid, passwd, true);
		}

		var done = this.async();

		// get All developers
		iterateOverDevs(null, url, dumpDeveloper);
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