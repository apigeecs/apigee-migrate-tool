var request = require('request');
var async = require('async');
var fs = require('fs');
"use strict";

/**
 * SpecStore class which wraps the API calls to the Apigee SpecStore API
 *
 * @param orgConfig
 * @constructor
 */
function SpecStore(orgConfig) {
    if (orgConfig.url !== 'https://api.enterprise.apigee.com') {
        throw new Error("SpecStore APIs only work for Apigee Edge (Cloud)");
    }
    this.orgConfig = orgConfig;
    this.apigeeAccessToken = null;
}

/**
 * Generate the access token from the login.apigee.com
 *
 * @param cb
 */
SpecStore.prototype.generateAccessToken = function(cb){
    if (this.orgConfig.url !== 'https://api.enterprise.apigee.com') {
        throw new Error("Access token can only be generated for Apigee Edge (Cloud)");
    }
    request({
        uri: "https://login.apigee.com/oauth/token",
        method: "POST",
        headers: {
            "Accept": "application/json"
        },
        auth: {
            user: "edgecli",
            pass: "edgeclisecret"
        },
        form: {
            "username": this.orgConfig.userid,
            "password": this.orgConfig.passwd,
            "grant_type": "password"
        },
        timeout: 5000,
    }, function (err, res, body) {
        var token = JSON.parse(body);
        if (token.error) {
            throw new Error(token.error);
        } else {
            cb(token.access_token);
        }
    });
}

/**
 * Format the request for sending to the Backend SpecStore API.
 *
 * This will also generate the access token if not already generated
 *
 * @param options
 * @param cb
 */
SpecStore.prototype.executeSpecStoreRequest = function (options, cb) {
    var currentObj = this;
    async.series({
        access_token : function(callback){
            /**
             * Check if the access token is available, if not generate one
             */
            if(currentObj.apigeeAccessToken != null) {
                callback(null, currentObj.apigeeAccessToken);
            } else {
                currentObj.generateAccessToken(function(token){
                    callback(null, token);
                });
            }
        }
    }, function(err, results){
        if(results.access_token) {
            currentObj.apigeeAccessToken = results.access_token;
            options['baseUrl'] = "https://apigee.com";
            if(!options['headers']) {
                options['headers'] = [];
            }
            if(!options['method']) {
                options['method'] = "GET";
            }
            options['headers']['Authorization'] = "Bearer " + currentObj.apigeeAccessToken;
            request(options, function(err,res,body){
                if(cb) {
                    cb(err, res, body);
                }
            });
        } else {
            throw new Error("Access token could not be generated");
        }
    })
}

/**
 * Get the SpecId for the homeFolder and pass it to the callback function.
 *
 * @param cb
 */
SpecStore.prototype.getHomeFolderURI = function (cb) {
    var currentobj = this;
    currentobj.executeSpecStoreRequest({
            uri: "/organizations/" + currentobj.orgConfig.org + "/specs/folder/home",
            headers: {
                "Accept": "application/json, text/plain, */*"
            },
        },
        function (err, res, body) {
            try {
                var body_json = JSON.parse(body);
            } catch (e) {
                console.log(res);
                throw e;
            }
            cb(body_json);
        });
}

/**
 * Get the contents of a folder given the folder specstore id
 *
 * @param folder_uri
 * @param cb
 */
SpecStore.prototype.getFolderContents = function (folder_uri, cb) {
    this.executeSpecStoreRequest({
            uri: folder_uri,
            headers: {
                "Accept": "application/json"
            },
            debug : true,
        },
        function (err, res, body) {
            var contents = [];
            if(err) {
                cb(contents);
            } else {
                if(body != undefined) {
                    var body_json = JSON.parse(body);
                    for (var i = 0; i < body_json.contents.length; i++) {
                        var e = body_json.contents[i];
                        if (e.kind != 'Folder' && e.kind != 'Doc') {
                            continue;
                        }
                        if (!contents[e.kind]) {
                            contents[e.kind] = [];
                        }
                        contents[e.kind][e.name] = e.self;
                    }
                }
                cb(contents);
            }
        });
}

/**
 *
 * Delete the entity for the given spec_uri
 *
 * @param uri
 * @param cb
 */
SpecStore.prototype.deleteSpecStoreObject = function(uri, cb){
    this.executeSpecStoreRequest({
        method: "DELETE",
        uri : uri
    },cb);
}

/**
 *  Delete the contents given the folder_uri
 *
 *  Callback function is called to return results
 *
 * @param folder_uri
 * @param cb
 */
SpecStore.prototype.deleteFolderContents = function (folder_uri, cb){

    var currentObj = this;

    currentObj.getFolderContents(folder_uri, function(contents){

        //folder is empty so return cb
        if(Object.keys(contents).length == 0) {
            if(cb){
                cb(folder_uri);
            }
        } else {
            if(contents['Doc']) {
                async.forEach(Object.keys(contents['Doc']), function (name, callback) {
                    var uri = contents['Doc'][name];
                    currentObj.deleteSpecStoreObject(uri, function (err, res, body) {
                        if (err) {
                            callback(err);
                        } else {
                            callback();
                        }
                    });
                }, function (err) {
                        if (err) {
                            if (cb)
                                cb('error');
                        } else {
                            if(!contents['Folder']) {
                                if (cb)
                                    cb(folder_uri);
                            }
                        }
                    });
            }
            if (contents['Folder']) {
                async.forEach(Object.keys(contents['Folder']), function (name, callback) {
                    var uri = contents['Folder'][name];
                    currentObj.deleteFolderContents(uri, function (_folder_id) {
                        if (_folder_id !== 'error') {
                            currentObj.deleteSpecStoreObject(_folder_id, function (err, res, body) {
                                if (err) {
                                    callback(err)
                                } else {
                                    callback();
                                }
                            });
                        } else {
                            callback('error');
                        }
                    });
                }, function (err) {
                        if (err) {
                            if (cb)
                                cb('error');
                        } else {
                            if (cb)
                                cb(folder_uri);
                        }
                    });
            }
        }
    });

}

/**
 * Purge all the contents in the spec store (including specs and folders)
 *
 * @param cb
 */
SpecStore.prototype.purgeEverything = function(cb){
    var currentObj = this;
    currentObj.getHomeFolderURI(function(json){
        currentObj.deleteFolderContents(json.self, function () {
            cb();
        });
    });
}

/**
 * Create a folder in the given parent folder (referenced by the uri)
 *
 * @param parent_folder_uri
 * @param folder_name
 * @param cb
 */
SpecStore.prototype.createFolder = function (parent_folder_uri, folder_name, cb) {
    var currentObj = this;
    this.executeSpecStoreRequest({
        method: "POST",
        uri: '/organizations/' + currentObj.orgConfig.org + '/specs/folder',
        json: {
            name: folder_name,
            folder: parent_folder_uri
        },
        headers: {
            "Accept": "application/json"
        }
    }, function (err, res, body) {
        var body_json = body;
        cb(body_json);
    });
}

/**
 * Upload a spec to the specified parent folder
 *
 * @param parent_folder_id
 * @param specName
 * @param srcFile
 * @param cb
 */
SpecStore.prototype.uploadSpecFile = function (parent_folder_id, specName, srcFile, cb){
    var currentObj = this;

    //Create a new spec and upload the file
    currentObj.executeSpecStoreRequest({
        uri: '/organizations/' + currentObj.orgConfig.org + '/specs/doc',
        method: 'POST',
        headers: {
            "Accept": "application/json, text/plain, */*"
        },
        json: {
            name: specName,
            kind: "Doc",
            folder: parent_folder_id
        }
    }, function (err, res, body) {
        var body_json = body;
        currentObj.executeSpecStoreRequest({
            uri: body_json.content,
            method: "PUT",
            headers: {
                "content-type": "text/plain",
            },
            body: fs.readFileSync(srcFile)
        }, function (err2, res2, body2) {
            if (err2) {
                if(cb) {
                    cb("Unable to upload [" + srcFile + "] to specstore");
                }
            }
            if(cb) {
                cb();
            }
        })
    });
}

/**
 * Upload local folder to spec store.
 *
 * @param folder_id - The uri of the folder to upload contents to
 * @param path - Corresponding folder on the filesystem
 */
SpecStore.prototype.uploadDirectoryContents = function(folder_id, path){
    var currentObj = this;
    console.log("Uploading ->  " + path);
    fs.lstat(path, function(err, stats){
        if(stats.isDirectory()) {
            fs.readdir(path, function (err, files) {
                files.forEach(function(entry){
                    fs.lstat(path  + "/" + entry, function(err2, stats2){
                        if(stats2.isDirectory()) {
                            currentObj.createFolder(folder_id, entry, function(json){
                                currentObj.uploadDirectoryContents(json.id, path  + "/" + entry);
                            });
                        } else {
                            if (entry.slice(-5) == '.yaml' || entry.slice(-5) == '.json') { //Only upload yaml or json files
                                var spec_name = entry.slice(0, -5); // remove the .yaml extension
                                currentObj.uploadSpecFile(folder_id, spec_name, path + "/" + entry);
                            }
                        }
                    });
                })
            });
        }
    });
}

/**
 * Upload all files from local folder to spec store
 *
 * @param path
 */
SpecStore.prototype.uploadToSpecStore = function(path){
    var currentObj = this;
    currentObj.getHomeFolderURI(function(json){
        currentObj.uploadDirectoryContents(json.id, path);
    });
}

/**
 * Download the contents of the folder to local machine
 *
 * @param folder_uri - ID of the folder in SpecStore
 * @param path - local path to download the folder contents to
 */
SpecStore.prototype.downloadFolderContents = function(folder_uri, path){
    var currentObj = this;

    if (!fs.existsSync(path)){
        fs.mkdirSync(path);
    }
    currentObj.getFolderContents(folder_uri, function(contents){
        if(contents['Doc']){
            /*
             * Spec is named on the local file system as a combination of spec_uri and the spec name
             *
             * As of the writing of this utility the SpecStore API allows for multiple specs with same name.
             *
             */
            Object.keys(contents['Doc']).forEach(function(key){
                currentObj.executeSpecStoreRequest({
                    uri : contents['Doc'][key] + "/content",
                    headers: {
                        "Accept": "text/plain",
                    }
                }, function(err, res, body) {
                    fs.writeFile(path + "/" + key + ".yaml", body, function(err2){
                        if (err2) throw err2;
                    });
                });
            });
        }
        if(contents['Folder']) {
            Object.keys(contents['Folder']).forEach(function (key) {
                currentObj.downloadFolderContents(contents['Folder'][key], path + "/" + key);
            });
        }
    })
}

module.exports = SpecStore;