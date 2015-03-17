/*jslint node: true */
var request = require('request');
var apigee = require('../config.js');
var products;
module.exports = function(grunt) {
	'use strict';
	grunt.registerTask('exportProducts', 'Export all products from org ' + apigee.from.org + " [" + apigee.from.version + "]", function() {
		var url = apigee.from.url;
		var org = apigee.from.org;
		var userid = apigee.from.userid;
		var passwd = apigee.from.passwd;
		var filepath = grunt.config.get("exportProducts.dest.data");
		var done_count =0;

		grunt.verbose.write("getting products..." + url);
		url = url + "/v1/organizations/" + org + "/apiproducts";

		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				//grunt.log.write(body);
			    products =  JSON.parse(body);
			   
			    
			    for (var i = 0; i < products.length; i++) {
			    	var product_url = url + "/" + products[i];
			    	grunt.file.mkdir(filepath);

			    	//Call product details
					request(product_url, function (error, response, body) {
						if (!error && response.statusCode == 200) {
							grunt.verbose.write(body);
						    var product_detail =  JSON.parse(body);
						    var dev_file = filepath + "/" + product_detail.name;
						    grunt.file.write(dev_file, body);
						}
						else
						{
							grunt.log.error(error);
						}
						done_count++;
						if (done_count == products.length)
						{
							grunt.log.ok('Processed ' + done_count + ' products');
							done();
						}
					}).auth(userid, passwd, true);
			    	// End product details
			    };
			    
			} 
			else
			{
				grunt.log.error(error);
			}
		}).auth(userid, passwd, true);
		var done = this.async();
	});

	grunt.registerMultiTask('importProducts', 'Import all products to org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var files = this.filesSrc;
		var done_count=0;
		var opts = {flatten: false};
		var f = grunt.option('src');
		if (f)
		{
			grunt.verbose.write('src pattern = ' + f);
			files = grunt.file.expand(opts,f);
		}
		url = url + "/v1/organizations/" + org + "/apiproducts";
		var done = this.async();

		files.forEach(function(filepath) {
			var content = grunt.file.read(filepath);
			//grunt.verbose.write(content);	
			request.post({
			  headers: {'content-type' : 'application/json'},
			  url:     url,
			  body:    content
			}, function(error, response, body){
			  var status = 999;
			  if (response)	
				status = response.statusCode;
			  grunt.verbose.writeln('Resp [' + status + '] for product creation ' + this.url + ' -> ' +body);
			  if (error || status!=201)
			  { 
			  	grunt.verbose.error('ERROR Resp [' + status + '] for product creation ' + this.url + ' -> ' +body); 
			  }
			 done_count++;
			if (done_count == files.length)
			{
				grunt.log.ok('Processed ' + done_count + ' products');
				done();
			}
			}.bind( {url: url}) ).auth(userid, passwd, true);

		});
	});

	grunt.registerMultiTask('deleteProducts', 'Delete all products from org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var files = this.filesSrc;
		var done_count = 0;
		var opts = {flatten: false};
		var f = grunt.option('src');
		if (f)
		{
			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts,f);
		}
		url = url + "/v1/organizations/" + org + "/apiproducts/";
		var done = this.async();
		files.forEach(function(filepath) {
			var content = grunt.file.read(filepath);
			var product = JSON.parse(content);
			var del_url = url + product.name;
			grunt.verbose.write(del_url);	
			request.del(del_url, function(error, response, body){
			  var status = 999;
			  if (response)	
				status = response.statusCode;
			  grunt.verbose.writeln('Resp [' + status + '] for product deletion ' + this.del_url + ' -> ' + body);
			  if (error || status!=200)
			  { 
			  	grunt.verbose.error('ERROR Resp [' + status + '] for product deletion ' + this.del_url + ' -> ' + body); 
			  }
				done_count++;
				if (done_count == files.length)
				{
					grunt.log.ok('Processed ' + done_count + ' products');
					done();
				}
			}.bind( {del_url: del_url}) ).auth(userid, passwd, true);

		});
	});

};