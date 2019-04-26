/*jslint node: true */
var request = require('request');
var apigee = require('../config.js');
var async = require('async');
var apps;
module.exports = function(grunt) {
	'use strict';
	grunt.registerTask('exportApps', 'Export all apps from org ' + apigee.from.org + " [" + apigee.from.version + "]", function() {
		var url = apigee.from.url;
		var org = apigee.from.org;
		var userid = apigee.from.userid;
		var passwd = apigee.from.passwd;
		var filepath = grunt.config.get("exportApps.dest.data");
		var done_count =0;
		var dev_count =0;
		var total_apps =0;
		var dev_url;
		var done = this.async();
		grunt.verbose.write("getting developers..." + url);
		url = url + "/v1/organizations/" + org + "/developers";

		var dumpApps = function(email) {
			dev_url = url + "/" + email;
			//Call developer details
			request(dev_url, function (dev_error, dev_response, dev_body) {
				if (!dev_error && dev_response.statusCode == 200) {
					//grunt.verbose.write(dev_body);
					var dev_detail = JSON.parse(dev_body);
					var last = dev_detail.email;
					var dev_folder = filepath + "/" + dev_detail.email;
					grunt.file.mkdir(dev_folder);
					//Get developer Apps
					var apps_url = url + "/" + dev_detail.email + "/apps?expand=true";
					grunt.verbose.writeln(apps_url);
					request(apps_url, function (app_error, app_response, app_body) {
						if (!app_error && app_response.statusCode == 200) {

							var apps_detail = JSON.parse(app_body);
							grunt.verbose.write(app_body);
							var apps = apps_detail.app;
							//grunt.verbose.write(apps);
							if (apps) {
								for (var j = 0; j < apps.length; j++) {
									var app = apps[j];
									grunt.verbose.writeln(app);
									//var file_name  = dev_folder + "/" + app.appId;
									var file_name = dev_folder + "/" + app.name;
									grunt.verbose.writeln("writing file: " + file_name);
									grunt.file.write(file_name, JSON.stringify(app));
								}
								;
							}
							total_apps += apps.length;

							if (apps.length > 0) {
								grunt.log.ok('Retrieved ' + apps.length + ' apps for ' + dev_detail.email);
							} else {
								grunt.verbose.writeln('Retrieved ' + apps.length + ' apps for ' + dev_detail.email);
							}
						}
						else {
							if (error)
								grunt.log.error(error);
							else
								grunt.log.error(body);
						}
						done_count++;
						if (done_count == dev_count) {
							grunt.log.ok('Exported ' + total_apps + ' apps for ' + done_count + ' developers');
						}
					}).auth(userid, passwd, true);
				}
				else {
					if (dev_error)
						grunt.log.error(dev_error);
					else
						grunt.log.error(dev_body);
				}
			}).auth(userid, passwd, true);
			// End Developer details
		}

		var iterateOverDevs = function(start, base_url, callback) {
			var url = base_url;

			if (start) {
				url += "?startKey=" + encodeURIComponent(start);
			}
			grunt.verbose.write("getting developers..." + url);

			request(url, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var devs = JSON.parse(body);
					var last = null;

					// detect that the only developer returned is the one we asked to start with; that's the end game.
					if (devs.length == 1 && devs[0] == start) {
						grunt.log.ok('Retrieved total of ' + dev_count + ' developers');

					} else {
						dev_count += devs.length;
						if (start)
							dev_count--;

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

		iterateOverDevs(null, url, dumpApps);
	});



	grunt.registerMultiTask('importApps', 'Import all apps to org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
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

		async.eachSeries(files, function (filepath,callback) {
			console.log(filepath);
			var folders = filepath.split("/");
			var dev = folders[folders.length - 2];
			var content = grunt.file.read(filepath);
			var app = JSON.parse(content);
			grunt.verbose.writeln("Creating app : " + app.name + " under developer " + dev);

			delete app['appId'];
			//delete app['status'];
			delete app['developerId'];
			delete app['lastModifiedAt'];
			delete app['lastModifiedBy'];
			delete app['createdAt'];
			delete app['createdBy'];
			//delete app['status'];
			delete app['appFamily'];
			delete app['accessType'];
			delete app['credentials'];

			grunt.verbose.writeln(JSON.stringify(app));
			var app_url = url + dev + "/apps";
			grunt.verbose.writeln("Creating App " + app_url);

			request.post({
			  headers: {'Content-Type' : 'application/json'},
			  url:     app_url,
			  body:    JSON.stringify(app)
			}, function(error, response, body){
				try{
				  done_count++;
				  var cstatus = 999;
				  if (response)	
				  	  cstatus = response.statusCode;
				  if (cstatus == 200 || cstatus == 201)
				  {
				  grunt.verbose.writeln('Resp [' + response.statusCode + '] for create app  ' + this.app_url + ' -> ' + body);
				  var app_resp = JSON.parse(body);

				  if (app['status'] && (app_resp['status'] != app['status']))
				  {
					  var status_url = app_url + '/' + app.name + '?action=';
					  if (app['status'] == 'approved')
						  status_url += "approve";
					  else
						  status_url += "revoke";

					  // Set the app status
					  request.post(status_url, function(error, response, body){
						  var status = 999;
						  if (response)
							  status = response.statusCode;
						  grunt.verbose.writeln('Resp [' + status + '] for ' + this.dev + ' - ' + this.app_name + ' - ' + this.status_url + ' -> ' + body);
						  if (error || status!=204)
							  grunt.verbose.error('ERROR Resp [' + status + '] for ' + this.dev + ' - ' + this.app_name + ' - ' + this.status_url + ' -> ' + body);

					  }.bind( {dev:dev, status_url: status_url, app_name: app.name}) ).auth(userid, passwd, true);
				  }

				  var client_key = app_resp.credentials[0].consumerKey;
				  //grunt.verbose.writeln("deleting key -> " + client_key);
				  var delete_url = app_url + '/' + app.name + '/keys/' + client_key;
				  //grunt.verbose.writeln("KEY Delete URL -> " + delete_url);

		          // Delete the key generated when App is created
		      	  request.del(delete_url,function(error, response, body){
				    var status = 999;
				    if (response)	
				  	  status = response.statusCode;
				  	grunt.verbose.writeln('Resp [' + status + '] for key delete ' + this.delete_url + ' -> ' + body);
				  	if (error || status!=200 )
					  	grunt.log.error('ERROR Resp [' + status + '] for key delete ' + this.delete_url + ' -> ' + body); 
					}.bind( {delete_url: delete_url}) ).auth(userid, passwd, true);
		      	  	// END of Key DELETE
		      	  }
		      	  else
		      	  {
		      	  	grunt.verbose.writeln('ERROR Resp [' + response.statusCode + '] for create app  ' + this.app_url + ' -> ' + body);
		      	  	callback();
		      	  }
				}
				catch(err)
				{
					grunt.log.error("ERROR - from App URL : " + app_url );
					grunt.log.error(body);
				}
				if (done_count == files.length)
				{
					grunt.log.ok('Processed ' + done_count + ' apps');
					done();
				}
				callback();
			}.bind( {app_url: app_url}) ).auth(userid, passwd, true);	
		});
		var done = this.async();
	});


	grunt.registerMultiTask('deleteApps', 'Delete all apps from org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
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
		files.forEach(function(filepath) {
			grunt.verbose.writeln("processing file " + filepath);
			var folders = filepath.split("/");
			var dev = folders[folders.length - 2];
			var content = grunt.file.read(filepath);
			var app = JSON.parse(content);
			var app_del_url = url + dev + "/apps/" + app.name;
			grunt.verbose.writeln(app_del_url);
			request.del(app_del_url,function(error, response, body){
			   var status = 999;
			   if (response)	
			    status = response.statusCode;
			  grunt.verbose.writeln('Resp [' + status + '] for delete app ' + this.app_del_url + ' -> ' + body);
			  done_count++;
			  if (error || status!=200)
			  	grunt.verbose.error('ERROR Resp [' + status + '] for delete app ' + this.app_del_url + ' -> ' + body); 
			  if (done_count == files.length)
			  {
				grunt.log.ok('Processed ' + done_count + ' apps');
				done();
			  }
			}.bind( {app_del_url: app_del_url}) ).auth(userid, passwd, true);	
		});

	});

};


Array.prototype.unique = function() {
    var a = this.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i].name === a[j].name)
                a.splice(j--, 1);
        }
    }
    return a;
};