const assert = require('assert');
const sdk = require('../sdk');
const fs = require('fs');
const path = require('path');

const validateFileNamesInDirectory = (directory) => {
		return fs
			.readdirSync(path.join(process.cwd(), process.env.TREECREEPER_SCHEMA_DIRECTORY, directory))
			.filter(fileName => /\.yaml$/.test(fileName))
			.forEach(fileName => {
				const content = sdk.readYaml.file(process.env.TREECREEPER_SCHEMA_DIRECTORY, path.join(directory, fileName));
				assert.equal(content.name, fileName.replace('.yaml', ''), `\`name\` property of ${fileName} does not match the file name - is there a typo in the file name or the name property?`)
			});
}

const validateFileNames = () => {
	validateFileNamesInDirectory('types')
	validateFileNamesInDirectory('relationships')
}

module.exports = {validateFileNames}
