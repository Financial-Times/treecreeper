const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const logger = require('@financial-times/n-logger').default;
const deepFreeze = require('deep-freeze');

const readFile = (rootDirectory, filePath) => {
	try {
		const file = fs.readFileSync(
			path.join(process.cwd(), rootDirectory, filePath),
			'utf8',
		);
		return deepFreeze(yaml.load(file));
	} catch (err) {
		logger.error(
			{ event: 'BIZ_OPS_SCHEMA_LOAD_ERROR', file: filePath },
			err,
		);
		throw err;
	}
};

const readDirectory = (rootDirectory, directory) => {
	try {
		return fs
			.readdirSync(path.join(process.cwd(), rootDirectory, directory))
			.filter(fileName => /\.yaml$/.test(fileName))
			.map(fileName =>
				readFile(rootDirectory, path.join(directory, fileName)),
			);
	} catch (e) {
		console.log(e);
		return [];
	}
};

module.exports = {
	directory: readDirectory,
	file: readFile,
};
