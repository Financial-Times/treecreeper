const visit = require('unist-util-visit-parents');
const resolvePropertyName = require('../resolve-system-property-name');
const convertNodeToProblem = require('./convert-node-to-problem');

module.exports = function setBizopsPropertyNames({ systemProperties }) {
	function mutate(node) {
		const property = resolvePropertyName({
			heading: node.key,
			systemProperties,
		});

		if (!property) {
			convertNodeToProblem({
				node,
				message: `i couldn't resolve ${node.key} to a property name`,
			});
			return;
		}

		const [name, type] = property;

		node.key = name;

		node.propertyType = type.type;
	}

	return function transform(tree) {
		visit(tree, 'property', mutate);
	};
};
