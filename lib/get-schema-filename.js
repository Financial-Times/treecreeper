const semver = require('semver');

const getSchemaFilename = version => {
	const majorVersion = semver.major(version);
	const isPrerelease = !!semver.prerelease(version);

	return `v${majorVersion}${isPrerelease ? '-prerelease' : ''}.json`;
};

module.exports = getSchemaFilename;
