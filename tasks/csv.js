
var apigee = require('../config.js');
var csvtojson = require("csvtojson");
var fs = require("fs");
var apigee = require('../config.js');

module.exports = function(grunt) {
	'use strict';

	grunt.registerTask('readCSVDevs', 'Read CSV file and create Data folder ', function() {

		var output_filepath = grunt.config.get("readCSVDevs.out_devs.data");
		var csvFileName = grunt.config.get("readCSVDevs.in_devs.data");

		var Converter = csvtojson.core.Converter;

		var fileStream=fs.createReadStream(csvFileName);
		var csvConverter = new Converter({});

		//read from file
		fileStream.pipe(csvConverter);
		this.async();


		csvConverter.on("record_parsed", function(resultRow, rawRow, rowIndex) {
			var dev = resultRow;
		    grunt.verbose.writeln('Record:' + rowIndex + ' ' + JSON.stringify(resultRow));
		    var dev_file = output_filepath + dev.email;
		    //grunt.file.mkdir(dev_file);
		    grunt.file.write(dev_file, JSON.stringify(dev));
		});

		//end_parsed will be emitted once parsing finished
		csvConverter.on("end_parsed",function(jsonObj){
		   //console.log(jsonObj); //here is your result json object
		   //this.done();
		   grunt.verbose.writeln('File Processing done');
		});


	});
	
}