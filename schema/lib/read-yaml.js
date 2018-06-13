const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const logger = require('@financial-times/n-logger').default;

const readFile = filePath => {
	try {
		const file = fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
		return yaml.load(file);
	} catch (err) {
		logger.error({ event: 'BIZ_OPS_SCHEMA_LOAD_ERROR', file: filePath }, err);
		throw err;
	}
};

const readDirectory = directory => {
	return fs
		.readdirSync(path.join(process.cwd(), directory))
		.filter(fileName => /\.yaml$/.test(fileName))
		.map(fileName => readFile(path.join(directory, fileName)));
};

module.exports = {
	directory: readDirectory,
	file: readFile
};
