/*jslint node: true */
var request = require('request');
var apigee = require('../config.js');
var async = require('async');
var kvms;
module.exports = function(grunt) {
	'use strict';
	grunt.registerTask('exportProxyKVM', 'Export all proxy-kvm from org ' + apigee.from.org + " [" + apigee.from.version + "]", function() {
		var url = apigee.from.url;
		var org = apigee.from.org;
		var userid = apigee.from.userid;
		var passwd = apigee.from.passwd;
		var filepath = grunt.config.get("exportProxyKVM.dest.data");
		var done_count = 0;
		var done = this.async();
		var proxies_url = url + "/v1/organizations/" + org + "/apis";
		grunt.verbose.writeln("========================= export Proxy KVMs ===========================" );

		grunt.verbose.writeln(proxies_url);
		grunt.file.mkdir(filepath);
		request(proxies_url, function (proxy_error, proxy_response, proxy_body) {
			if (!proxy_error && proxy_response.statusCode == 200) {
				grunt.verbose.writeln("PROXY body: " + proxy_body);
			    var proxies =  JSON.parse(proxy_body);
			    for (var j = 0; j < proxies.length; j++) {
			    	var proxy = proxies[j];
			    	// grunt.verbose.writeln("PROXY name: " + proxy);
			    	var proxy_url = url + "/v1/organizations/" + org + "/apis/" + proxy + "/keyvaluemaps";
			    	grunt.verbose.writeln("Proxy KVMs URL: " + proxy_url);
			    	// BUG
			    	// This won't work as is, need to wait for all proxy KVMs to be written
			    	//
				    request(proxy_url, function (error, response, body) {
						if (!error && response.statusCode == 200) {
							grunt.verbose.writeln("PROXY KVMs: " + this.proxy + " : " + body);
						    kvms =  JSON.parse(body);   						    
						    for (var i = 0; i < kvms.length; i++) {
						    	var proxy_kvm_url = this.proxy_url + "/" + kvms[i];	
						    	grunt.verbose.writeln("KVM URL : " + proxy_kvm_url);
						    	var proxy = this.proxy;
						    	//Call kvm details
								request(proxy_kvm_url, function (error, response, body) {
									if (!error && response.statusCode == 200) {
										grunt.verbose.writeln(body);
									    var kvm_detail =  JSON.parse(body);
									    var kvm_file = filepath + "/" + this.proxy + "/" + kvm_detail.name;
									    grunt.file.write(kvm_file, body);
									    grunt.verbose.writeln('Proxy KVM ' + kvm_detail.name + ' written!');
									}
									else
									{
										grunt.log.error(error);
									}
								}.bind( {proxy: proxy})).auth(userid, passwd, true);
						    	// End kvm details
						    };					    
						} 
						else
						{
							grunt.log.error(error);
						}
						done_count++;
						if (done_count == proxies.length)
						{
							grunt.log.ok('Exported ' + done_count + ' proxy KVMs.');
                            grunt.verbose.writeln("================== export Proxy KVMs DONE()" );
							done();
						}
					}.bind( {proxy_url: proxy_url, proxy: proxy})).auth(userid, passwd, true);
				}
			}
			else
			{
				grunt.log.error(error);
			}
		}).auth(userid, passwd, true);
		
		setTimeout(function() {
		    grunt.verbose.writeln("================== Proxy KVMs Timeout done" );
		    done(true);
		}, 3000);
		grunt.verbose.writeln("========================= export Proxy KVMs DONE ===========================" );
		
	});


	grunt.registerMultiTask('importProxyKVM', 'Import all proxy-kvm to org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var done_count =0;
		var files;
		url = url + "/v1/organizations/" + org + "/apis";
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
			console.log(filepath);
			var folders = filepath.split("/");
			var proxy = folders[folders.length - 2];
			var content = grunt.file.read(filepath);
			var kvm = JSON.parse(content);
			grunt.verbose.writeln("Creating KVM : " + kvm.name + " for proxy " + proxy);
			grunt.verbose.writeln(JSON.stringify(kvm));
			var kvm_url = url + "/" + proxy + "/keyvaluemaps";
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
		});
		//var done = this.async();
	});


	grunt.registerMultiTask('deleteProxyKVM', 'Delete all proxy-kvm from org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var done_count =0;
		var files;
		url = url + "/v1/organizations/" + org + "/apis";
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
			var proxy = folders[folders.length - 2];
			var content = grunt.file.read(filepath);
			var kvm = JSON.parse(content);
			var kvm_del_url = url + "/" + proxy + "/keyvaluemaps/" + kvm.name;
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
		});

	});

};
