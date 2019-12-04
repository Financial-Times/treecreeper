const visit = require('unist-util-visit-parents');
const convertNodeToProblem = require('./convert-node-to-problem');

module.exports = function validateTreecreeperBlacklistProperties({
	validateProperty,
	propertyNameBlacklist,
}) {
	function mutate(node) {
		if (propertyNameBlacklist.includes(node.key)) {
			return convertNodeToProblem({
				node,
				message: `${node.key} is not permitted within markdown (to allow other people to edit it)`,
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
