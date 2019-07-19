/*jslint node: true */
var request = require('request');
var apigee = require('../config.js');
var shared_flows;
module.exports = function(grunt) {
	'use strict';
	grunt.registerTask('exportSharedFlows', 'Export all shared flows from org ' + apigee.from.org + " [" + apigee.from.version + "]", function() {
		var url = apigee.from.url;
		var org = apigee.from.org;
		var userid = apigee.from.userid;
		var passwd = apigee.from.passwd;
		var fs = require('fs');
		var filepath = grunt.config.get("exportSharedFlows.dest.data");
		var done_count =0;
        var done = this.async();

        grunt.verbose.writeln("========================= export Shared Flows ===========================" );
		url = url + "/v1/organizations/" + org + "/sharedflows";
        grunt.verbose.writeln("Getting shared flows... " + url);

		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {
			    shared_flows =  JSON.parse(body);
			    if( shared_flows.length == 0 ) {
                    grunt.verbose.writeln ("exportSharedFlows: No Shared flows");
                    grunt.verbose.writeln("================== export Shared Flows DONE()" );
                    done();
                } else {
    			    for (var i = 0; i < shared_flows.length; i++) {
    			    	var shared_flow_url = url + "/" + shared_flows[i];
    			    	grunt.file.mkdir(filepath);

    			    	//Call shared flow details
    					request(shared_flow_url, function (error, response, body) {
    						if (!error && response.statusCode == 200) {
    							grunt.verbose.writeln("SHAREDFLOW " + body);
    						    var shared_flow_detail =  JSON.parse(body);
    						    var shared_flow_file = filepath + "/" + shared_flow_detail.name;
    						    // gets max revision - May not be the deployed version
    						    var max_rev = shared_flow_detail.revision[shared_flow_detail.revision.length -1];

    						    var shared_flow_download_url = url + "/" + shared_flow_detail.name + "/revisions/" + max_rev + "?format=bundle";
    						    grunt.verbose.writeln ("Fetching shared flow bundle  : " + shared_flow_download_url);

    						    request(shared_flow_download_url).auth(userid, passwd, true)
    							  .pipe(fs.createWriteStream(filepath + "/" + shared_flow_detail.name + '.zip'))
    							  .on('close', function () {

                                    grunt.verbose.writeln('Shared Flow ' + shared_flow_detail.name + '.zip written!');
                                    done_count++;
                                    if (done_count == shared_flows.length)
                                    {
                                        grunt.log.ok('Exported ' + done_count + ' shared flows.');
                                        grunt.verbose.writeln("================== export Shared Flows DONE()" );
                                        done();
                                    }
    							  });
    						}
    						else
                            {
                                done_count++;
                                if (done_count == shared_flows.length)
                                {
                                    grunt.verbose.writeln('Error exporting ' + done_count + ' shared flows.');
                                    grunt.verbose.writeln("================== export Shared Flows error DONE()" );
                                    done();
                                } else {
                                    grunt.verbose.writeln('Error exporting: ' + response.statusCode + " URL: " + shared_flow_url);
                                }
                                grunt.log.error(error);
                            }
    					}).auth(userid, passwd, true);
    			    	// End shared flow details
    			    }; 
			    }
			} 
			else
			{
                grunt.verbose.writeln("ERROR getting SharedFlows: " + response.statusCode + " response: " + error);
				grunt.log.error(error);
			}
		}).auth(userid, passwd, true);
        /*
        setTimeout(function() {
            grunt.verbose.writeln("================== Shared Flows Timeout done" );
            done(true);
        }, 3000);
        grunt.verbose.writeln("========================= export Shared Flows DONE ===========================" );
        */
	});

    grunt.registerMultiTask('importSharedFlows', 'Import all shared flows to org ' + 
        apigee.to.org + " [" + apigee.to.version + "]", function() {
        var url = apigee.to.url;
        var org = apigee.to.org;
        var userid = apigee.to.userid;
        var passwd = apigee.to.passwd;
        var files;
        var done_count = 0;
        url = url + "/v1/organizations/" + org + "/sharedflows?action=import&name=";
        var fs = require('fs');
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
            //console.log(filepath);
            var filename = filepath.replace(/^.*[\\\/]/, '');
            var name = filename.slice(0, -4);
            //console.log(name);
            var req = request.post(url+name, function (err, resp, body) {
              if (err) {
                grunt.verbose.log(err);
              } else {
                grunt.verbose.writeln('Resp [' + resp.statusCode + '] for shared flow creation ' + this.url + ' -> ' + body);
              }
              done_count++;
              if (done_count == files.length)
                {
                    grunt.log.ok('Processed ' + done_count + ' shared flows');
                    done();
                }
            }.bind( {url: url+name}) ).auth(userid, passwd, true);
            var form = req.form();
            form.append('file', fs.createReadStream(filepath));
        });
        var done = this.async();
    });

    grunt.registerMultiTask('deleteSharedFlows', 'Delete all shared flows from org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
        var url = apigee.to.url;
        var org = apigee.to.org;
        var userid = apigee.to.userid;
        var passwd = apigee.to.passwd;
        var done_count =0;
        var files;
        url = url + "/v1/organizations/" + org + "/sharedflows/";
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
            var shared_flow_file = folders[folders.length - 1];
            var shared_flow = shared_flow_file.split(".")[0];
            var app_del_url = url + shared_flow;
            grunt.verbose.writeln(app_del_url);
            request.del(app_del_url, function(error, response, body){
              grunt.verbose.writeln('Resp [' + response.statusCode + '] for shared flow deletion ' + this.app_del_url + ' -> ' + body);
              if (error || response.statusCode!=200)
                  grunt.verbose.error('ERROR Resp [' + response.statusCode + '] for shared flow deletion ' + this.app_del_url + ' -> ' + body);
                  done_count++;
                  if (done_count == files.length)
                {
                    grunt.log.ok('Processed ' + done_count + ' shared flows');
                    done();
                }
            }.bind( {app_del_url: app_del_url}) ).auth(userid, passwd, true);
        });
    });


    grunt.registerTask('deploySharedFlows', 'Deploy revision 1 on all shared flows for org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
            var url = apigee.to.url;
            var org = apigee.to.org;
            var env = apigee.to.env;
            var userid = apigee.to.userid;
            var passwd = apigee.to.passwd;
            var done_count =0;
            var done = this.async();
            url = url + "/v1/organizations/" + org ;
			var shared_flows_url = url +  "/sharedflows" ;
            console.log(shared_flows_url);
            var shared_flow_url;

            request(shared_flows_url, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    //grunt.log.write(body);
                    shared_flows =  JSON.parse(body);

                    for (var i = 0; i < shared_flows.length; i++) {
                        var shared_flow_url = url + "/environments/" + env + "/sharedflows/" + shared_flows[i] + "/revisions/1/deployments";
                        console.log('shared_flow_url: ' + shared_flow_url);
                        grunt.verbose.writeln(shared_flow_url);
                        //Call shared flow deploy
                        request.post(shared_flow_url, function (error, response, body) {
                            if (!error && response.statusCode == 200) {
                                grunt.verbose.writeln('Resp [' + response.statusCode + '] for shared flow deployment ' + this.shared_flow_url + ' -> ' + body);
                            }
                            else
                            {
                                grunt.log.error('ERROR Resp [' + response.statusCode + '] for shared flow deployment ' + this.shared_flow_url + ' -> ' + body);
                            }
                            done_count++;
                              if (done_count == shared_flows.length)
                            {
                                grunt.log.ok('Processed ' + done_count + ' shared flows');
                                done();
                            }
                        }).auth(userid, passwd, true);
                        // End shared flow deploy
                    };

                }
                else
                {
                    grunt.log.error(error);
                }
            }.bind( {shared_flow_url: shared_flow_url}) ).auth(userid, passwd, true);
    });

    grunt.registerTask('undeploySharedFlows', 'UnDeploy revision 1 on all shared flows for org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
            var url = apigee.to.url;
            var org = apigee.to.org;
            var env = apigee.to.env;
            var userid = apigee.to.userid;
            var passwd = apigee.to.passwd;
            var done_count =0;
            var done = this.async();
            url = url + "/v1/organizations/" + org ;
            var shared_flows_url = url +  "/sharedflows" ;

            request(shared_flows_url, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    //grunt.log.write(body);
                    shared_flows =  JSON.parse(body);

                    for (var i = 0; i < shared_flows.length; i++) {
                        var shared_flow_url = url + "/environments/" + env + "/sharedflows/" + shared_flows[i] + "/revisions/1/deployments";
                        grunt.verbose.writeln(shared_flow_url);
                        //Call shared flow undeploy
                        request.del(shared_flow_url, function (error, response, body) {
                            if (!error && response.statusCode == 200) {
                                grunt.verbose.writeln(body);
                            }
                            else
                            {
                                grunt.log.error(error);
                            }
                            done_count++;
                              if (done_count == shared_flows.length)
                            {
                                grunt.log.ok('Processed ' + done_count + ' shared flows');
                                done();
                            }
                        }).auth(userid, passwd, true);
                        // End shared flow undeploy
                    };

                }
                else
                {
                    grunt.log.error(error);
                }
            }).auth(userid, passwd, true);
    });

};
