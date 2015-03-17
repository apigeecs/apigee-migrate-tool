# apigee-migrate-tool

##Installation

1.	Download and Install node - http://nodejs.org/download/

2.	Open a command prompt and install grunt using the command 
--
    npm install -g grunt-cli

3.	Install the node dependencies 
--
    npm install

4.	Run “grunt” to get all the grunt tasks.
 

5.	Edit the config.js file to suit your environment
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

NOTE : It is recommended to take a backup of both the system using the backup scripts provided with the sdk before running this tool.

- All exports work on the “from” configurations in config.js and store the data in the “data” folder on your local system.
- All imports and delete tasks work on the “to” configurations in config.js. 
- Deletes made using these scripts cannot be rollbacked. 
