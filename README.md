# Apigee Organization Data Migration Tool

Use this tool to migrate configuration information and entities from one Apigee Edge organization to another. 

**IMPORTANT**
- Make a backup of both systems using the backup scripts provided with the OPDK before running this tool.
- All export tasks work on the “from” configurations in your config.js and store the data in the “data” folder on your local system.
- All imports and delete tasks work on the “to” configurations in config.js. 
- **Deletes made using these scripts cannot be rolled back. Please use delete commands with caution.**

License -  [MIT](https://github.com/apigeecs/apigee-migrate-tool/blob/master/LICENSE) 

## Data migrated

With the tool, you can import and export data about:
- developers
- proxies (latest version)
- shared flows
- products
- apps
- app keys
- KVMs (org and env)

You can also import the following kinds of data from a CSV file to an Apigee org:
  - Developers
  - Apps
  - App Keys
  - KVM (Org and Env)

## Data not migrated

**Please note** that the following entities won't be migrated as part of this tool. In most cases, you'll need to migrate these manually using the Apigee Edge console. For more on migrating these, see the Apigee [documentation on org data migration](https://docs.apigee.com/api-services/content/migrating-data-apigee-trial-org).
 - Cache resources and cached values.
 - Environment resources such as target servers, virtualhosts, and keystores.
 - KVM entries for "encrypted" key-value maps. Encrypted values can't be retrieved using the management API. Make a note of the values you're using in your old org, then add these values manually to the new org.
 - Organization or environment level resources such as .jar files, .js files, and so on.
 - Flow hooks. You can use the UI to download these and import them into the new org.

## Installing the tool

1. Download and install Node.js at http://nodejs.org/download/.
1. Open a command prompt and install Grunt using the command.
    ```
    npm install -g grunt-cli
    ```
1. To get the tool, clone this repository.
    ```
    command
    ```
1. Install the node dependencies. 
    ```
    npm install
    ```
1. Edit the config.js file to suit your environment.
    ```
    module.exports = {
        from: {
            version: 'R22',
            url: 'http://mgmt-server’,
            userid: 'user-id’,
            passwd: 'your-password',
            org: 'your-org',
            env: 'your-env'
        },
        to: {
            version: '14.0.7',
            url: 'http://mgmt-server’,
            userid: 'user-id’,
            passwd: 'your-password',
            org: 'your-org',
            env: 'your-env'
        }
    } ;
    ```
1. Run `grunt` to run all the grunt tasks.
   ![](https://github.com/shahbagdadi/apigee-migrate-tool/blob/master/image/tasks.png)


## Usage

### To export all data types 
```
grunt exportAll -v
```	
The switch `-v` is for verbose mode. The following folder structure with data will be created in your current directory.

 ![](https://github.com/shahbagdadi/apigee-migrate-tool/blob/master/image/export.png)


### To import Developers

```
grunt importDevs -v 
```

You may want to redirect standard out to log files, so they can be reviewed later. It will import all the developers from the data/devs folder to the org specified in the *to* configuration in your config.js file.

### When importing, run tasks in the following sequence

 `importProxies` -> `importDevs` -> `importProducts` -> `importApps` -> `importKeys`

By default the `importDevs`, `importApps`, and `importKeys` tasks import all the entities from the respective data folder. 

### To import a specific entity you can pass an argument `src` as shown below.

```
grunt importApps -v --src=./data/apps/*/App*
```
	
The above command will import all apps starting with "App" irrespective of the developer the app belongs to. 
For more details on other globbing patterns supported please refer to [Globbing Pattern](http://gruntjs.com/configuring-tasks#globbing-patterns).

### To import Developers or Apps from a csv file.

```
grunt readCSVDevs -v 
```

The above command will read the input/devs.csv file and generate the developer json files in the data/devs folder. These developers can then be imported to your org using the importDevs command shown earlier. 

A sample devs.csv file is shown below.

![](https://github.com/shahbagdadi/apigee-migrate-tool/blob/master/image/devs_csv.png)

This will create a corresponding json in the data/devs/mqb2btools@whatever.com, as shown below.

![](https://github.com/shahbagdadi/apigee-migrate-tool/blob/master/image/dev_json.png)

You can also import Apps from a csv file in a similar way. Take a look at the sample apps.csv in the input folder.
