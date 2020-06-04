/*jslint node: true */
var request = require('request');
var apigee = require('../config.js');
var async = require('async');
var apps;
module.exports = function(grunt) {
	'use strict';

	grunt.registerMultiTask('importKeys', 'Import all app keys to org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var done_count =0;
		var files;
		url = url + "/v1/organizations/" + org + "/developers/";
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

		async.eachSeries(files, function (filepath,callback_files) {
			console.log( "filepath: " + filepath );
			var folders = filepath.split("/");
			var dev = folders[folders.length - 2];
			var app = grunt.file.readJSON(filepath);
			var credentials = app.credentials;
			for (var i = 0; i < credentials.length; i++) {
				var cKey = credentials[i].consumerKey;
				var cSecret = credentials[i].consumerSecret;
				var products = credentials[i].apiProducts;
				var key_payload = "<CredentialRequest><ConsumerKey>" + cKey + "</ConsumerKey><ConsumerSecret>" + cSecret + "</ConsumerSecret><Attributes></Attributes></CredentialRequest>";
				grunt.verbose.writeln(key_payload);
				var products_payload = {};

				var prods = [];
				for (var j = 0; j < products.length; j++) {
					prods.push(products[j].apiproduct);
				};

				products_payload['apiProducts'] = prods;
				var create_key_url = url + dev + "/apps/" + app.name + "/keys/";
				async.series([
				    function(callback){
				    	
						request.post({
						  headers: {'Content-Type' : 'application/xml'},
						  url:     create_key_url + "create",
						  body:    key_payload
						}, function(error, response, body){
						  var status = 999;
						  if (response)	
						  	status = response.statusCode;
						  grunt.verbose.writeln('Resp [' + status + '] for ' + this.dev + ' - ' + this.create_key_url + ' -> ' + body);
						  if (error || status!=201)
						  	grunt.verbose.error('ERROR Resp [' + status + '] for ' + this.dev + ' - ' + this.create_key_url + ' -> ' + body); 
  				          callback(null, 'one');
						}.bind( {dev:dev, create_key_url: create_key_url}) ).auth(userid, passwd, true);	

				    },
				    function(callback){
				    	//urlencode the key
						cKey = encodeURI(cKey);
				        grunt.verbose.writeln(create_key_url+ cKey);
				        grunt.verbose.writeln(JSON.stringify(products_payload));
 						request.post({
						  headers: {'Content-Type' : 'application/json'},
						  url:     create_key_url + cKey,
						  body:    JSON.stringify(products_payload)
						}, function(error, response, body){
						  var status = 999;
						  if (response)	
						  	status = response.statusCode;
						  grunt.verbose.writeln('Resp [' + status + '] for ' + this.dev + ' - ' + this.app_name + ' - ' + this.products + ' - ' + this.cKey + ' product assignment -> ' + body);
						  if (error || status!=200)
						  	grunt.verbose.error('ERROR Resp [' + status + '] for ' + this.dev + ' - ' + this.app_name + ' - ' + this.products + ' - ' + this.cKey + ' product assignment -> ' + body); 
						  callback(null, 'two');
						}.bind( {dev:dev, cKey: cKey, app_name: app.name, products: JSON.stringify(products_payload)}) ).auth(userid, passwd, true);	
				        
				    },
				    function(callback){
				    	var done_cnt =0;
				    	for (var k = 0; k < prods.length; k++) {
					    	var approve_key_url = create_key_url + cKey + "/apiproducts/" + prods[k] + "?action=approve";
					        grunt.verbose.writeln("Approve products for key - " + approve_key_url);
	 						request.post(approve_key_url, function(error, response, body){
						    var status = 999;
						    if (response)	
						  	  status = response.statusCode;
							grunt.verbose.writeln('Resp [' + status + '] for ' + this.dev + ' - ' + this.app_name + ' - ' + this.product + ' - ' + this.cKey + ' - ' + this.approve_key_url + ' -> ' + body);
							if (error || status!=204)
							  	grunt.verbose.error('ERROR Resp [' + status + '] for ' + this.dev + ' - ' + this.app_name + ' - ' + this.product + ' - ' + this.cKey + ' - ' + this.approve_key_url + ' -> ' + body); 
							done_cnt++;							 
							if (done_cnt == prods.length)
							  	callback(null, 'three');
							}.bind( {dev:dev, approve_key_url: approve_key_url, cKey: cKey, app_name: app.name, product: prods[k]}) ).auth(userid, passwd, true);
						}      
				    }
				], function(err, results){
					grunt.verbose.writeln("Keys migrated for app " + app.name + " results: " + results);
					done_count++;
					if (done_count == files.length) {
						grunt.log.ok('Processed ' + done_count + ' keys');
						done();
					}
				});
			}
			callback_files();
		});
	});

	grunt.registerMultiTask('deleteKeys', 'Delete all app keys from org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var done_flag =false;
		var file_count = 0;
		var files;
		url = url + "/v1/organizations/" + org + "/developers/";
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
			var folders = filepath.split("/");
			var dev = folders[folders.length - 2];
			var app = grunt.file.readJSON(filepath);
			var credentials = app.credentials;
			for (var i = 0; i < credentials.length; i++) {
				var cKey = credentials[i].consumerKey;
				//urlencode the key
				cKey = encodeURI(cKey);
				var delete_key_url = url + dev + "/apps/" + app.name + "/keys/" + cKey;
				grunt.verbose.writeln(delete_key_url);    	
				request.del(delete_key_url , function(error, response, body){
				  var status = 999;
				  if (response)	
				  	status = response.statusCode;
				  grunt.verbose.writeln('Resp [' + status + '] for ' + this.cKey + ' deletion -> ' + body);
				  if (error || status!=200)
				  	grunt.verbose.error('ERROR Resp [' + status + '] for ' + this.cKey + ' deletion -> ' + body); 
				  if (i == credentials.length)
				  	file_count++;
				  if ((file_count == files.length) && (i == credentials.length))
				  	done();
				}.bind( {cKey: cKey}) ).auth(userid, passwd, true);	
			};
		});
	});

};