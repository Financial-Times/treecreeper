const defaultBlacklistProperties = [
	'lastReleaseTimestamp',
	'dependentCapabilities',
	'dependentProducts',
	'dependents',
	'lastServiceReviewDate',
	'lastSOSReport',
	'piiSources',
	'recursiveDependencies',
	'recursiveDependentProducts',
	'recursiveDependents',
	'replacedBy',
	'repositories',
	'SF_ID',
	'sosTrafficLight',
	'stakeholders',
	'updatesData',
	'dataOwner',
	'gdprRetentionProcess',
	'gdprErasureProcess',
];

const applyBlacklistProperties = (additionalBlacklistProperties = []) =>
	defaultBlacklistProperties.concat(additionalBlacklistProperties);

module.exports = applyBlacklistProperties;
