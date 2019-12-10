const visit = require('unist-util-visit-parents');
const { selectAll } = require('unist-util-select');
const builder = require('unist-builder');
const parseMultilineDefinition = require('../parse-multiline-definition');
const setTreecreeperPropertyNames = require('./set-treecreeper-property-names');
const append = require('../append-node');

function createPropertyNodes(node, nestedProperties) {
	const parsedPropertyNodes = parseMultilineDefinition(node);

	// We should ignore code property because this property is used for relationship implicitly,
	// So we'll skip this property for check existence in markdown and add manually
	const propertyNodes = builder('root', {
		children: parsedPropertyNodes.filter(
			propNode => propNode.key !== 'code',
		),
	});

	// call setTreecreeperPropertyNames transformer against nested property.
	setTreecreeperPropertyNames({
		properties: nestedProperties,
	})(propertyNodes);

	// Add code property implicitly after property names have set
	const codeNode = parsedPropertyNodes.find(
		propNode => propNode.key === 'code',
	);
	append({ ...codeNode, propertyType: 'Code' }, propertyNodes);
	return propertyNodes;
}

module.exports = function parseNestedMutlilineProperties({
	typeNames,
	properties,
}) {
	function mutate(node) {
		// This mutation works only nested property definition.
		const isNested = typeNames.has(node.propertyType);
		if (!isNested) {
			return;
		}
		const nestedProperties = properties[node.key].properties || {};
		const listedDefinitions = selectAll('listItem', node);
		if (listedDefinitions.length) {
			node.children = listedDefinitions.map(propNode =>
				createPropertyNodes(propNode, nestedProperties),
			);
		} else {
			node.children = [createPropertyNodes(node, nestedProperties)];
		}
	}

	return function transform(tree) {
		visit(tree, 'property', mutate);
	};
};
