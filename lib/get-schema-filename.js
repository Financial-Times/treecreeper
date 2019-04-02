const semver = require('semver');
const { version: libVersion } = require('../package.json');

const getSchemaFilename = (version = libVersion) => {
	const majorVersion = semver.major(version);
	const isPrerelease = !!semver.prerelease(version);

	return `v${majorVersion}${isPrerelease ? '-prerelease' : ''}.json`;
};

module.exports = getSchemaFilename;
