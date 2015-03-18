# apigee-migrate-tool

##Installation

1.	Download and Install node - http://nodejs.org/download/

2.	Open a command prompt and install grunt using the command 

	npm install -g grunt-cli

3.	Install the node dependencies 

	npm install

4.	Edit the config.js file to suit your environment
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

5.	Run “grunt” to get all the grunt tasks.

 ![](https://github.com/shahbagdadi/apigee-migrate-tool/blob/master/image/tasks.png)


**IMPORTANT**
- It is recommended to take a backup of both the system using the backup scripts provided with the sdk before running this tool.
- All exports tasks work on the “from” configurations in config.js and store the data in the “data” folder on your local system.
- All imports and delete tasks work on the “to” configurations in config.js. 
- **Deletes made using these scripts cannot be rollbacked. Please use delete commands with caution.**





##Usage

- To export all data type 
	```
	grunt exportAll -v
	```
	The switch -v is for verbose mode. The following folder structure with data will be created in your current directory.

 ![](https://github.com/shahbagdadi/apigee-migrate-tool/blob/master/image/export.png)


- To import Developers 
	```
	grunt importDevs -v 
	```
You may want to redirect standard out to log files, so they can be reviewed later. It will import all the developers from the data/devs folder to the org specified in the *to* configuration in your config.js file.

- For imports run in the following sequence 

 "importProxies" -> "importDevs"-> "importProducts"-> "importApps"-> "importKeys"

- By default the importDevs, importApps, importKeys imports all the entities from the respective data folder. 

- To import a specific entities you can pass an argument src as shown below.
	```
	grunt importApps -v --src=./data/apps/*/App*
	```
The above command will import all apps starting with "App" irrespective of the developer the app belongs to. 
For more details on other globbing patterns supported please refer to  [Globbing Pattern] (http://gruntjs.com/configuring-tasks#globbing-patterns) 

