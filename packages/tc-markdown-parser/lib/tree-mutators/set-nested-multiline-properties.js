const visit = require('unist-util-visit-parents');
const { select, selectAll } = require('unist-util-select');
const builder = require('unist-builder');
const convertNodeToProblem = require('./convert-node-to-problem');
const parseMultilineDefinition = require('../parse-multiline-definition');
const setTreecreeperPropertyNames = require('./set-treecreeper-property-names');
const append = require('../append-node');

const splitValueIntoChildren = (valueList, valuePosition) => {
	const values = valueList.split(',');
	const starts = values.map(value => valueList.indexOf(`,${value}`) + 1);
	const ends = starts.map((position, i) =>
		starts[i + 1] ? starts[i + 1] - 2 : Infinity,
	);

	return values
		.map(str => str.trim())
		.map((value, i) =>
			builder('text', {
				value,
				position: {
					start: {
						line: valuePosition.start.line,
						column: starts[i],
					},
					end: {
						line: valuePosition.start.line,
						column: ends[i],
					},
				},
			}),
		);
};

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

	// converts the nested property to the same node structure as if it was top level
	// in order to facilitate recursive calling of property coercers
	// TO CONSIDER - should both the top level properties and the nested ones
	// be normalised to a more generic structure, rather than the nested seeking to emulate
	// the top level? Probably yes, but baby steps to get this working first
	propertyNodes.children.forEach(propertyNode => {
		propertyNode.isRelationshipProperty = true;

		if (propertyNode.hasMany) {
			const { position } = propertyNode;
			const valueNodes = splitValueIntoChildren(
				propertyNode.children[0].value,
				position,
			);
			propertyNode.children = [
				builder('root', { position }, [
					builder(
						'list',
						{ position },
						valueNodes.map(valueNode =>
							builder('listItem', { position }, [
								builder('paragraph', { position }, [valueNode]),
							]),
						),
					),
				]),
			];
		} else {
			const { position } = propertyNode;
			propertyNode.children = [
				builder('root', { position }, [
					builder('paragraph', { position }, propertyNode.children),
				]),
			];
		}
	});

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
		const { hasMany, properties: nestedProperties = {} } =
			properties[node.key];
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
