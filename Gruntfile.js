var apigee = require('./config.js');
module.exports = function(grunt) {

 //require('time-grunt')(grunt);
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    availabletasks: {           // task 
            tasks: {options: {
            filter: 'exclude',
            tasks: ['mkdir', 'availabletasks', 'warn', 'default']
        }}               // target 
        },
    exportDevs: {
       dest: './data/devs'       
    },
    exportProducts: {
       dest: './data/products'       
    },
    exportApps: {
       dest: './data/apps'       
    },
    exportProxies: {
       dest: './data/proxies'       
    },
    exportOrgKVM: {
       dest: './data/kvm/org'       
    },
    exportEnvKVM: {
       dest: './data/kvm/env'       
    },
    exportProxyKVM: {
       dest: './data/kvm/proxy'       
    },
    exportSharedFlows: {
       dest: './data/sharedflows'       
    },
    importProxies: {
        src: './data/proxies/*.zip'
    },
    importSharedFlows: {
        src: './data/sharedflows/*.zip'
    },
    importProducts: {
        src: 'data/products/*'
    },
    importDevs: {
        src: 'data/devs/*'
    },
    importApps: {
        src: 'data/apps/*/*'
    },
    importKeys: {
        src: 'data/apps/*/*'
    },
    importOrgKVM: {
        src: 'data/kvm/org/*'       
    },
    importEnvKVM: {
        src: 'data/kvm/env/*/*'
    },
    importProxyKVM: {
        src: 'data/kvm/proxy/*/*'
    },
    deleteKeys: {
        src: 'data/apps/*/*'
    },
    deleteApps: {
        src: 'data/apps/*/*'
    },
    deleteProducts: {
        src: 'data/products/*'
    },
    deleteDevs: {
        src: './data/devs/*'       
    },
    deleteProxies: {
        src: './data/proxies/*'
    },
    deleteSharedFlows: {
        src: './data/sharedflows/*'
    },
    deleteOrgKVM: {
        src: './data/kvm/org/*'
    },
    deleteEnvKVM: {
        src: './data/kvm/env/*/*'
    },
    deleteProxyKVM: {
        src: './data/kvm/proxy/*/*'
    },
    readCSVDevs: {
        in_devs: './input/devs.csv',
        out_devs: './data/devs/'   
      },
    readCSVApps: {
        in_apps: './input/apps.csv',
        out_apps: './data/apps/'
    }

  });

  require('load-grunt-tasks')(grunt);
  grunt.loadTasks('tasks');

  grunt.registerTask('default', ['availabletasks']);
  grunt.registerTask('deleteAll', ['warn','deleteProducts','deleteDevs','deleteApps','deleteKeys','deleteProxies','deleteSharedFlows', 'deleteEnvKVM', 'deleteOrgKVM', 'deleteProxyKVM']);
  grunt.registerTask('exportAll', ['exportDevs','exportProducts','exportApps','exportProxies','exportSharedFlows','exportOrgKVM','exportEnvKVM','exportProxyKVM']);
  grunt.registerTask('importAll', ['importSharedFlows','importProxies','importDevs','importProducts', 'importApps','importKeys', 'importOrgKVM', 'importEnvKVM', 'importProxyKVM']);

  grunt.registerTask('warn', 'Display Warning', function() {
      var readline = require('readline');
      var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      var done = this.async();
      rl.question('THIS SCRIPT WILL DELETE ONE OR MORE RESOURCES FROM THE ORG - ' + apigee.to.org + ' [' + apigee.to.version + '].' + ' THIS ACTION CANNOT BE ROLLED BACK. Do you want to continue (yes/no) ? ', function(answer) {
        if (answer.match(/^y(es)?$/i))
          done(true);
        else
           done(false);
      });
  });

};