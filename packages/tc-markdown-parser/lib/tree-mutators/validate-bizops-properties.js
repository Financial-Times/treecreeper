const visit = require('unist-util-visit-parents');
const convertNodeToProblem = require('./convert-node-to-problem');

const excludedProperties = [
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

module.exports = function coerceBizopsPropertiesToType({ validateProperty }) {
	function mutate(node) {
		if (excludedProperties.includes(node.key)) {
			return convertNodeToProblem({
				node,
				message: `${node.key} is not permitted within runbook.md (to allow other people to edit it)`,
			});
		}
		try {
			validateProperty(node.key, node.value);
		} catch (error) {
			return convertNodeToProblem({
				node,
				message: error.message,
			});
		}
	}

	return function transform(tree) {
		visit(tree, 'property', mutate);
	};
};

module.exports.excludedProperties = excludedProperties;
