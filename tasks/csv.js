
var apigee = require('../config.js');
var csvtojson = require("csvtojson");
var fs = require("fs");
var apigee = require('../config.js');

module.exports = function(grunt) {
	'use strict';

	grunt.registerTask('readCSVDevs', 'Read CSV file for devs ', function() {

		var output_filepath_dev = grunt.config.get("readCSVDevs.out_devs.data");
		var csvFileName = grunt.config.get("readCSVDevs.in_devs.data");
		var output_filepath_apps = grunt.config.get("readCSVApps.out_apps.data");
		//var output_filepath_apps = grunt.config.get("exportApps.dest.data");

		var Converter = csvtojson.core.Converter;

		var fileStream=fs.createReadStream(csvFileName);
		var csvConverter = new Converter({});

		//read from file
		fileStream.pipe(csvConverter);
		this.async();


		csvConverter.on("record_parsed", function(resultRow, rawRow, rowIndex) {
			var dev = resultRow;
		    grunt.verbose.writeln('Record:' + rowIndex + ' ' + JSON.stringify(resultRow));
		    var dev_file = output_filepath_dev + dev.email;
		    grunt.file.write(dev_file, JSON.stringify(dev));
		    //create a developer folder inside of /data/apps
		    // var dev_folder = output_filepath_apps + "/" + dev.email;
		    // grunt.file.mkdir(dev_folder);
		    //create an empty app file
		    // if(dev.apps.length !== 0)
		    // {
      //          	var app_file = dev_folder + "/" + dev.apps[0];
		    //     grunt.file.write(app_file, '');
		    // }
		});

		//end_parsed will be emitted once parsing finished
		csvConverter.on("end_parsed",function(jsonObj){
		   //console.log(jsonObj); //here is your result json object
		   //this.done();
		   grunt.verbose.writeln('File Processing done');
		});


	});





	grunt.registerTask('readCSVApps', 'Read CSV file for apps ', function() {

		var output_filepath_apps = grunt.config.get("readCSVApps.out_apps.data");
		var csvFileName = grunt.config.get("readCSVApps.in_apps.data");

		var Converter = csvtojson.core.Converter;

		var fileStream=fs.createReadStream(csvFileName);
		var csvConverter = new Converter({});

		//read from file
		fileStream.pipe(csvConverter);
		this.async();


		csvConverter.on("record_parsed", function(resultRow, rawRow, rowIndex) {
			var app = resultRow;
		    grunt.verbose.writeln('Record:' + rowIndex + ' ' + JSON.stringify(resultRow));
		    var dev_folder = output_filepath_apps + "/" + app.developer;
		    if(!grunt.file.exists(dev_folder))
		    {
              grunt.file.mkdir(dev_folder);
		    }
            var app_file = dev_folder + "/" + app.name;
		    grunt.file.write(app_file, JSON.stringify(app));
		});

		//end_parsed will be emitted once parsing finished
		csvConverter.on("end_parsed",function(jsonObj){
		   //console.log(jsonObj); //here is your result json object
		   //this.done();
		   grunt.verbose.writeln('File Processing done');
		});


	});
	
}