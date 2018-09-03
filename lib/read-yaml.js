const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const logger = require('@financial-times/n-logger').default;
const deepFreeze = require('deep-freeze');

const readFile = filePath => {
	try {
		const file = fs.readFileSync(path.join(__dirname, '../', filePath), 'utf8');
		return deepFreeze(yaml.load(file));
	} catch (err) {
		logger.error({ event: 'BIZ_OPS_SCHEMA_LOAD_ERROR', file: filePath }, err);
		throw err;
	}
};

const readDirectory = directory => {
	return fs
		.readdirSync(path.join(__dirname, '../', directory))
		.filter(fileName => /\.yaml$/.test(fileName))
		.map(fileName => readFile(path.join(directory, fileName)));
};

module.exports = {
	directory: readDirectory,
	file: readFile
};
