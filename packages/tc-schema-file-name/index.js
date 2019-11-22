const semver = require('semver');
const { version } = require('./package.json');

const getSchemaFilename = () => {
	const majorVersion = semver.major(version);
	const isPrerelease = !!semver.prerelease(version);

	return `v${majorVersion}${isPrerelease ? '-prerelease' : ''}.json`;
};

module.exports = { getSchemaFilename };
