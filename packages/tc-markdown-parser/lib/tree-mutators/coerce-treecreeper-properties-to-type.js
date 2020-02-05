const { selectAll } = require('unist-util-select');
const stripHtmlComments = require('strip-html-comments');
const schema = require('@financial-times/tc-schema-sdk');
const propertyCoercers = require('../property-coercers');
const convertNodeToProblem = require('./convert-node-to-problem');
const normalizePropertyKey = require('../normalize-property-key');
const flattenNodeToPlainString = require('../flatten-node-to-plain-string');
const setPropertyNodeValue = require('./set-property-node-value');

function dropHtmlComment(value) {
	if (Array.isArray(value)) {
		return value.map(dropHtmlComment);
	}
	if (typeof value === 'string') {
		return stripHtmlComments(value).trim();
	}
	return value;
}

function omitEmptyPropertyNode(tree) {
	tree.children = tree.children.reduce((omittedChildren, node) => {
		// on property node, omit the node if its value is empty -- maybe true when value includes html comment
		if (node.type === 'property' && node.value === '') {
			return omittedChildren;
		}
		return [...omittedChildren, node];
	}, []);
	return tree;
}

function getCoercer({ isNested, primitiveType, propertyType }) {
	const subdocumentPropertyTypes = new Set([
		'Document',
		'Paragraph',
		'Sentence',
	]);
	const isSubdocument = subdocumentPropertyTypes.has(propertyType);
	const isString = primitiveType === 'String' && !isSubdocument;

	if (isString) {
		return isNested
			? propertyCoercers.NestedString
			: propertyCoercers.String;
	}

	if (isSubdocument) {
		return propertyCoercers.Subdocument;
	}

	return propertyCoercers[primitiveType];
}

const coerceNonNestedPropertyValue = (
	node,
	{ primitiveType, propertyType },
) => {
	const [subdocument] = node.children;

	const coercer = getCoercer({
		isNested: false,
		primitiveType,
		propertyType,
	});

	const coercion = coercer(subdocument);

	if (coercion.valid) {
		setPropertyNodeValue(node, dropHtmlComment(coercion.value));
	} else {
		convertNodeToProblem({
			node,
			message: coercion.value,
		});
	}
};

const coerceNestedPropertyValue = (
	node,
	{ primitiveTypesMap, hasMany, propertyType },
) => {
	try {
		const coercedProperties = node.children.map(subdocument =>
			subdocument.children.reduce((values, nestNode) => {
				if (nestNode.type === 'problem') {
					throw new Error(nestNode.message);
				}

				// if (schema.getEnums()[nestNode.propertyType]) {
				// 	values[nestNode.key] = nestNode.value;
				// 	return values;
				// }
				const primitiveType = primitiveTypesMap[nestNode.propertyType];

				const coercer = getCoercer({
					isNested: true,
					primitiveType,
					propertyType,
				});
				const coercion = coercer(nestNode, { hasMany });
				if (coercion.valid) {
					values[nestNode.key] = dropHtmlComment(coercion.value);
					return values;
				}
				throw new Error(coercion.value);
			}, {}),
		);
		setPropertyNodeValue(
			node,
			hasMany ? coercedProperties : coercedProperties[0],
		);
	} catch (error) {
		convertNodeToProblem({
			node,
			message: error.message,
		});
	}
};

const coerceEnumPropertyValue = (
	node,
	{ propertyType: enumName, hasMany, enums },
) => {
	let [subdocument] = node.children;
	const validValues = Object.values(enums[enumName]);

	let values;

	// if (node.isRelationshipProperty) {
	// 	if (node.children[0].type !== 'text') {
	// 		return convertNodeToProblem({
	// 			node,
	// 			message: 'Enum property on relationship missing',
	// 		});
	// 	}
	// 	const rawValue = node.children[0].value.toLowerCase();
	// 	if (hasMany) {
	// 		values = rawValue.split(',').map(str => str.trim());
	// 	} else {
	// 		if (rawValue.indexOf(',') > -1) {
	// 			return convertNodeToProblem({
	// 				node,
	// 				message:
	// 					'Passed in a list of enums when only a single one expected',
	// 			});
	// 		}
	// 		values = [rawValue];
	// 	}
	// } else {
		if (hasMany) {
			if (subdocument.children[0].type !== 'list') {
				return convertNodeToProblem({
					node,
					message: 'Must provide a list of enums',
				});
			}
			[subdocument] = subdocument.children;
		} else if (subdocument.children[0].type !== 'paragraph') {
			return convertNodeToProblem({
				node,
				message: 'Must provide a single enum, not a nested list',
			});
		}

		values = subdocument.children.map(child =>
			normalizePropertyKey(flattenNodeToPlainString(child)),
		);
	// }

	values = values.map(flattenedContent => {
		const validValue = validValues.find(value => {
			return flattenedContent === normalizePropertyKey(value);
		});

		return { validValue, flattenedContent, isValid: !!validValue };
	});

	if (values.every(({ isValid }) => isValid)) {
		if (hasMany) {
			setPropertyNodeValue(
				node,
				values.map(({ validValue }) => validValue),
			);
		} else {
			setPropertyNodeValue(node, values[0].validValue);
		}
	} else {
		const { flattenedContent } = values.find(({ isValid }) => !isValid);
		convertNodeToProblem({
			node,
			message: `${flattenedContent} is not a valid value for the enum ${enumName}. Valid values: ${validValues.toString()}`,
		});
	}
};

module.exports = function coerceTreecreeperPropertiesToType({
	typeNames,
	properties,
	primitiveTypesMap,
	enums,
}) {
	function mutate(node) {
		const { propertyType } = node;

		// If we come across a main type (such as System), then in the markdown
		// we will specify code with additional nested properties
		const isNested = typeNames.has(node.propertyType);

		const { hasMany } = properties[node.key];
		// If the propertyType is nested, or one of the primitive types, coerce it
		if (propertyType in primitiveTypesMap || isNested) {
			if (!isNested) {
				const isEmpty = !flattenNodeToPlainString(node);

				if (isEmpty) {
					convertNodeToProblem({
						node,
						message: `property "${node.key}" has no value`,
					});

					return;
				}

				coerceNonNestedPropertyValue(node, {
					primitiveType: primitiveTypesMap[node.propertyType],
					propertyType,
				});
			} else {
				coerceNestedPropertyValue(node, {
					primitiveTypesMap,
					hasMany,
					propertyType,
				});
			}
			return;
		}

		// If it's an enum, make sure it's a valid value for that enum
		if (propertyType in enums) {
			coerceEnumPropertyValue(node, {
				propertyType,
				hasMany,
				enums,
			});
			return;
		}

		convertNodeToProblem({
			node,
			message: `i couldn't resolve ${node.propertyType} to a valid biz-ops property type or enum`,
		});
	}

	return function transform(tree) {
		selectAll(':root > property', tree).forEach(mutate);
		return omitEmptyPropertyNode(tree);
	};
};
