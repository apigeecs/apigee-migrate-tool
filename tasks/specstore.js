/*jslint node: true */
var apigee = require('../config.js');
var SpecStore = require('../util/specstore.lib.js');

module.exports = function (grunt) {
    'use strict';

    /**
     * This will export out all the specifications with the folder structure from Apigee Edge spec store
     *
     */
    grunt.registerTask('exportAllSpecs', 'Export all Specs from org ' + apigee.from.org + " [" + apigee.from.version + "]", function () {

        if (apigee.from.url !== 'https://api.enterprise.apigee.com') {
            throw new Error("This will only works with Apigee Edge (Cloud)");
        }

        var filepath = grunt.config.get("exportAllSpecs.dest.data");
        var done = this.async();

        var specstoreObj = new SpecStore(apigee.from);
        specstoreObj.getHomeFolderURI(function(json){
            specstoreObj.downloadFolderContents(json.self, filepath);
        });
    });


    /**
     * Import will create specs in the destination org.
     * It will create duplicates if the directories / specs with the same name already exist but will not overwrite.
     *
     */
    grunt.registerTask('importAllSpecs', 'Import all Specs to ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
        if (apigee.to.url !== 'https://api.enterprise.apigee.com') {
            throw new Error("This will only works with Apigee Edge (Cloud)");
        }
        var filepath = grunt.config.get("importAllSpecs.src.data");
        var done = this.async();

        var specstoreObj = new SpecStore(apigee.to);
        specstoreObj.uploadToSpecStore(filepath);

    });

    /**
     * Import will create specs if they don't exist in the destination org.
     * It will overwrite any existing specifications with the same name in the same folder structure.
     *
     */
    grunt.registerTask('deleteAllSpecs', 'Delete all Specs from ' + apigee.to.org + " [" + apigee.to.version + "]", function () {
        if (apigee.to.url !== 'https://api.enterprise.apigee.com') {
            throw new Error("This will only works with Apigee Edge (Cloud)");
        }
        var done = this.async();
        var specstoreObj = new SpecStore(apigee.to);
        specstoreObj.purgeEverything(function () {
            grunt.verbose.writeln("Deleted all specs in '" + apigee.to.org + "' org !!");
            done();
        });

    });

}