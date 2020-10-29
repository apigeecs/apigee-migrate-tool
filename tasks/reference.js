/*jslint node: true */
var request = require('request');
var apigee = require('../config.js');
var references;
var APIGEE_ENTITY_SINGULAR = 'Reference';
var APIGEE_ENTITY_PLURAL = 'References';
var ENTITY_COMMAND_NAME = 'References'; //used to create exportReferences, importReferences, deleteReferences
var APIGEE_ENTITY_REQUEST_PATH = '/references';

module.exports = function(grunt) {
  'use strict';
  grunt.registerTask('export' + ENTITY_COMMAND_NAME, 'Export all ' + APIGEE_ENTITY_PLURAL.toLowerCase() + ' from org ' + apigee.from.org + " [" + apigee.from.version + "]", function() {
		var org = apigee.from.org;
		var env = apigee.from.env;
		var url = apigee.from.url;
		var userid = apigee.from.userid;
    var passwd = apigee.from.passwd;
    var filepath = grunt.config.get("export" + ENTITY_COMMAND_NAME + ".dest.data");
    var done_count = 0;
    var done = this.async();

    grunt.verbose.writeln("========================= export " + APIGEE_ENTITY_PLURAL + " ===========================");

    url = url + "/v1/organizations/" + org + "/environments/" +  env + APIGEE_ENTITY_REQUEST_PATH;
    grunt.verbose.writeln("getting " + APIGEE_ENTITY_PLURAL + " ..." + url);
    request(url, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        grunt.verbose.writeln(APIGEE_ENTITY_PLURAL + " " + body);
        references = JSON.parse(body);

        if (references.length == 0) {
          grunt.verbose.writeln("export" + ENTITY_COMMAND_NAME + ": No " + APIGEE_ENTITY_PLURAL);
          grunt.verbose.writeln("================== export " + APIGEE_ENTITY_PLURAL + " DONE()");
          done();
        } else {
          for (var i = 0; i < references.length; i++) {
            // Custom report
            var reference_url = url + "/" + encodeURIComponent(references[i]);
            grunt.file.mkdir(filepath);

            //Call reference details
            grunt.verbose.writeln(APIGEE_ENTITY_SINGULAR + ' URL: ' + reference_url);
            request(reference_url, function(error, response, body) {
              if (!error && response.statusCode == 200) {
                grunt.verbose.writeln(APIGEE_ENTITY_SINGULAR + ": " + body);
                var reference_detail = JSON.parse(body);
                var reference_file = filepath + "/" + reference_detail.name;
                grunt.file.write(reference_file, body);
                grunt.verbose.writeln(APIGEE_ENTITY_SINGULAR + ' ' + reference_detail.name + ' written!');
              } else {
                grunt.verbose.writeln('Error ' + response.statusCode + ' exporting ' + error);
                grunt.log.error(error);
              }

              done_count++;
              if (done_count == references.length) {
                grunt.log.ok('Exported ' + done_count + ' ' + APIGEE_ENTITY_PLURAL);
                grunt.verbose.writeln("================== export " + APIGEE_ENTITY_PLURAL + " DONE()");
                done();
              }
            }).auth(userid, passwd, true);
            // End reference details
          };
        }
      } else {
        grunt.log.error(error);
      }
    }).auth(userid, passwd, true);
  });


  grunt.registerMultiTask('import' + ENTITY_COMMAND_NAME, 'Import all ' + APIGEE_ENTITY_PLURAL.toLowerCase() + ' to org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
    var url = apigee.to.url;
    var org = apigee.to.org;
		var env = apigee.to.env;
    var userid = apigee.to.userid;
    var passwd = apigee.to.passwd;
    var done_count = 0;
    var files;
    url = url + "/v1/organizations/" + org + "/environments/" +  env + APIGEE_ENTITY_REQUEST_PATH;
    var done = this.async();
    var opts = {
      flatten: false
    };
    var f = grunt.option('src');
    if (f) {
      grunt.verbose.writeln('src pattern = ' + f);
      files = grunt.file.expand(opts, f);
    } else {
      files = this.filesSrc;
    }
    files.forEach(function(filepath) {
      console.log(filepath);
      var content = grunt.file.read(filepath);
      grunt.verbose.writeln(url);
      request.post({
        headers: {
          'Content-Type': 'application/json'
        },
        url: url,
        body: content
      }, function(error, response, body) {
        var status = 999;
        if (response)
          status = response.statusCode;
        grunt.verbose.writeln('Resp [' + status + '] for ' + APIGEE_ENTITY_SINGULAR.toLowerCase() + ' creation ' + this.url + ' -> ' + body);
        if (error || status != 201)
          grunt.verbose.error('ERROR Resp [' + status + '] for ' + APIGEE_ENTITY_SINGULAR.toLowerCase() + ' creation ' + this.url + ' -> ' + body);
        done_count++;
        if (done_count == files.length) {
          grunt.log.ok('Imported ' + done_count + ' ' + APIGEE_ENTITY_PLURAL.toLowerCase());
          done();
        }

      }.bind({
        url: url
      })).auth(userid, passwd, true);

    });
  });


  grunt.registerMultiTask('delete' + ENTITY_COMMAND_NAME, 'Delete all ' + APIGEE_ENTITY_PLURAL.toLowerCase() + ' from org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
    var url = apigee.to.url;
    var org = apigee.to.org;
		var env = apigee.to.env;
    var userid = apigee.to.userid;
    var passwd = apigee.to.passwd;
    var done_count = 0;
    var files = this.filesSrc;
    var opts = {
      flatten: false
    };
    var f = grunt.option('src');
    if (f) {
      grunt.verbose.writeln('src pattern = ' + f);
      files = grunt.file.expand(opts, f);
    }
    url = url + "/v1/organizations/" + org + "/environments/" +  env + APIGEE_ENTITY_REQUEST_PATH + "/";
    var done = this.async();
    files.forEach(function(filepath) {
      var content = grunt.file.read(filepath);
      var reference= JSON.parse(content);
      var del_url = url + reference.name;
      grunt.verbose.writeln(del_url);
      request.del(del_url, function(error, response, body) {
        var status = 999;
        if (response)
          status = response.statusCode;
        grunt.verbose.writeln('Resp [' + status + '] for ' + APIGEE_ENTITY_SINGULAR.toLowerCase() + ' deletion ' + this.del_url + ' -> ' + body);
        if (error || status != 200) {
          grunt.verbose.error('ERROR Resp [' + status + '] for ' + APIGEE_ENTITY_SINGULAR.toLowerCase() + ' deletion ' + this.del_url + ' -> ' + body);
        }
        done_count++;
        if (done_count == files.length) {
          grunt.log.ok('Processed ' + done_count + ' ' + APIGEE_ENTITY_PLURAL.toLowerCase());
          done();
        }
      }.bind({
        del_url: del_url
      })).auth(userid, passwd, true);

    });
  });
};
