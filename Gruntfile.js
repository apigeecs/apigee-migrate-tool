
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
    exportCompanies: {
        dest: './data/companies'
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
    exportTargetServers: {
       dest: './data/targetservers'
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
    exportFlowHooks: {
       dest: './data/flowhooks/flow_hook_config'
    },
    exportAllSpecs: {
      dest: './data/specs'
    },
    exportReports: {
       dest: './data/reports'
    },
    exportKeyStores: {
        dest: './data/keystores'
     },
    exportReferences: {
        dest: './data/references'
     },
     exportVirtualHosts: {
        dest: './data/virtualhosts'
     },
     exportCaches: {
        dest: './data/caches'
     },
    importProxies: {
        src: './data/proxies/*'
    },
    importSharedFlows: {
        src: './data/sharedflows/*.zip'
    },
    importFlowHooks: {
       src: './data/flowhooks/flow_hook_config'
    },
    importProducts: {
        src: 'data/products/*'
    },
    importDevs: {
        src: 'data/devs/*'
    },
    importCompanies: {
        src: 'data/companies/*'
    },
    importApps: {
        src: 'data/apps/*/*/*'
    },
    importKeys: {
        src: 'data/apps/*/*/*'
    },
    importTargetServers: {
        src: 'data/targetservers/*'
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
    importAllSpecs: {
        src: './data/specs'
    },
    importKeyStores: {
        src: './data/keystores/*'
    },
    importReferences: {
        src: './data/references/*'
    },
    importVirtualHosts: {
        src: './data/virtualhosts/*'
    },
    importCaches: {
        src: './data/caches/*'
    },
    deleteKeys: {
        src: 'data/apps/*/*/*'
    },
    deleteApps: {
        src: 'data/apps/*/*/*'
    },
    deleteProducts: {
        src: 'data/products/*'
    },
    deleteDevs: {
        src: './data/devs/*'
    },
    deleteCompanies: {
        src: './data/companies/*'
    },
    deleteProxies: {
        src: './data/proxies/*'
    },
    deleteSharedFlows: {
        src: './data/sharedflows/*'
    },
    deleteTargetServers: {
        src: './data/targetservers/*'
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
    deleteAllSpecs: {
    },
    deleteKeyStores: {
        src: './data/keystores/*'
    },
    deleteReferences: {
        src: './data/references/*'
    },
    deleteReferences: {
        src: './data/virtualhosts/*'
    },
    deleteVirtualHosts: {
        src: './data/virtualhosts/*'
    },
    deleteCaches: {
        src: './data/caches/*'
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
  grunt.registerTask('deleteAll', ['warn', 'deleteApps', 'deleteDevs', 'deleteCompanies', 'deleteProducts', 'deleteProxies', 'deleteFlowHooks', 'deleteSharedFlows', 'deleteTargetServers', 'deleteVirtualHosts', 'deleteEnvKVM', 'deleteOrgKVM', 'deleteProxyKVM', 'deleteKeys', 'deleteReports', 'deleteCaches', 'deleteReferences', 'deleteKeyStores']);
  grunt.registerTask('exportAll', ['exportDevs', 'exportCompanies', 'exportProducts', 'exportApps', 'exportProxies', 'exportSharedFlows', 'exportFlowHooks', 'exportTargetServers', 'exportProxyKVM', 'exportEnvKVM', 'exportOrgKVM', 'exportReports', 'exportKeyStores', 'exportReferences', 'exportVirtualHosts', 'exportCaches', 'exportAllSpecs']);
  grunt.registerTask('importAll', ['importKeyStores', 'importReferences', 'importCaches', 'importTargetServers', 'importVirtualHosts', 'importAllSpecs', 'importProducts', 'importDevs', 'importCompanies', 'importApps', 'importKeys', 'importProxies', 'importSharedFlows','importFlowHooks', 'importOrgKVM', 'importEnvKVM', 'importProxyKVM', 'importReports']);
  grunt.registerTask('tasks', ['availabletasks']);
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
