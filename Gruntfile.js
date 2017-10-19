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
    exportReports: {
        dest: './data/reports'
     },
    importProxies: {
        src: './data/proxies/*.zip'
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
    importReports: {
        src: './data/reports/*'
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
    deleteOrgKVM: {
        src: './data/kvm/org/*'
    },
    deleteEnvKVM: {
        src: './data/kvm/env/*/*'
    },
    deleteProxyKVM: {
        src: './data/kvm/proxy/*/*'
    },
    deleteReports: {
        src: './data/reports/*'
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
  grunt.registerTask('exportAll', ['exportDevs','exportProducts','exportApps', 'exportProxies', 'exportOrgKVM', 'exportEnvKVM', 'exportProxyKVM', 'exportReports']);
  grunt.registerTask('importAll', ['importProxies','importDevs','importProducts', 'importApps','importKeys', 'importOrgKVM', 'importEnvKVM', 'importProxyKVM', 'importReports']);
  grunt.registerTask('deleteAll', ['warn','deleteKeys','deleteApps','deleteProducts', 'deleteDevs', 'deleteProxies', 'deleteOrgKVM', 'deleteEnvKVM', 'deleteProxyKVM', 'deleteReports']);

  grunt.registerTask('warn', 'Display Warning', function() {
      var readline = require('readline');
      var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      var done = this.async();
      rl.question('THIS SCRIPT WILL DELETE ONE OR MORE RESOURCES will be deleted from the org - ' + apigee.to.org + ' [' + apigee.to.version + '].' + ' THIS ACTION CANNOT BE ROLLBACK. Do you want to continue (yes/no) ? ', function(answer) {
        if (answer.match(/^y(es)?$/i))
          done(true);
        else
           done(false);
      });
  });

};
