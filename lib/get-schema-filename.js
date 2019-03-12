const semver = require('semver');

const getSchemaFilename = versionData => {
	const majorVersion = semver.major(versionData);
	const isPrerelease = !!semver.prerelease(versionData);

	return `v${majorVersion}${isPrerelease ? '-prerelease' : ''}.json`;
};

module.exports = getSchemaFilename;
