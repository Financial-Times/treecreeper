const visit = require('unist-util-visit-parents');
const resolvePropertyName = require('../resolve-property-name');
const convertNodeToProblem = require('./convert-node-to-problem');

module.exports = function setTreecreeperPropertyNames({
	properties,
	nestedPrefix = '',
}) {
	const uniquePropertyNames = [];
	const createProblemMessage = message => {
		if (nestedPrefix !== '') {
			return `${message} of ${nestedPrefix} type`;
		}
		return message;
	};

	function mutate(node) {
		const property = resolvePropertyName({
			heading: node.key,
			properties,
		});

		if (!property) {
			convertNodeToProblem({
				node,
				message: createProblemMessage(
					`i couldn't resolve ${node.key} to a property name`,
				),
			});
			return;
		}

		const [name, type] = property;
		if (uniquePropertyNames.includes(name)) {
			convertNodeToProblem({
				node,
				message: createProblemMessage(
					`Duplicate headings for "${name}" field. Only one of each heading allowed in the markdown file.`,
				),
			});
			return;
		}
		uniquePropertyNames.push(name);

		node.key = name;

		node.propertyType = type.type;

		node.hasMany = !!properties[name].hasMany;
	}

	return function transform(tree) {
		visit(tree, 'property', mutate);
	};
};
