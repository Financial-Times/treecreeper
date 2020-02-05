const visit = require('unist-util-visit-parents');
const { select, selectAll } = require('unist-util-select');
const builder = require('unist-builder');
const schema = require('@financial-times/tc-schema-sdk');
const convertNodeToProblem = require('./convert-node-to-problem');
const parseMultilineDefinition = require('../parse-multiline-definition');
const setTreecreeperPropertyNames = require('./set-treecreeper-property-names');
const coerceTreecreeperPropertiesToType = require('./coerce-treecreeper-properties-to-type');
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

	// call setTreecreeperPropertyNames transformer recursively for nested property.
	setTreecreeperPropertyNames({
		properties: nestedProperties,
		nestedPrefix: node.propertyType,
	})(propertyNodes);

	propertyNodes.children.forEach(node => {
		node.isRelationshipProperty = true;
	});

	coerceTreecreeperPropertiesToType({
		properties: nestedProperties,
		typeNames: new Set(),
		primitiveTypesMap: schema.getPrimitiveTypes({
			output: 'graphql',
		}),
		enums: schema.getEnums(),
	})(propertyNodes);

	// If problem found on parsing properties, throw error with that position
	const foundProblemNode = select('problem', propertyNodes);
	if (foundProblemNode) {
		const error = new Error(foundProblemNode.message);
		error.position = foundProblemNode.position;
		throw error;
	}

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
		const { hasMany, properties: nestedProperties = {} } = properties[
			node.key
		];
		const listedDefinitions = selectAll('listItem', node);
		try {
			if (!listedDefinitions.length) {
				if (hasMany) {
					throw new Error(
						"expected a list, but didn't get any bulleted items",
					);
				}
				node.children = [createPropertyNodes(node, nestedProperties)];
			} else {
				node.children = listedDefinitions.map(propNode =>
					createPropertyNodes(propNode, nestedProperties),
				);
			}
		} catch (error) {
			convertNodeToProblem({
				node,
				message: error.message,
			});
			// Update position because new position indicates actial position what error occurred
			if (error.position) {
				node.position = error.position;
			}
		}
	}

	return function transform(tree) {
		visit(tree, 'property', mutate);
	};
};
