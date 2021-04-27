'use strict';

module.exports = function (grunt, companies_folder) {

	const mapCompanyToDeveloper = function (company) {
		let dev_email = null;

		const devs_file = path.join(companies_folder, company, "developers");
		const company_devs = grunt.file.readJSON(devs_file);

		if (company_devs && company_devs.developer && company_devs.developer.length > 0) {
			dev_email = company_devs.developer[0].email;
			grunt.verbose.writeln(`Mapping company ${company} to developer ${dev_email}`);
		}
		else {
			grunt.verbose.error(`Unable to find developer mapping for company ${company}`);
		}

		return dev_email;
	};

	return { mapCompanyToDeveloper };
};