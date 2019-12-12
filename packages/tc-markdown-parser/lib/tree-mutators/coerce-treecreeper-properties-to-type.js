const { selectAll } = require('unist-util-select');
const stripHtmlComments = require('strip-html-comments');
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

const coercePropertyValue = (node, { primitiveType, propertyType }) => {
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
	{ primitiveTypesMap, hasMany, propertyType, enums },
) => {
	const coercedProperties = node.children.map(subdocument =>
		subdocument.children.reduce((coercedValues, nestNode) => {
			if (nestNode.type === 'problem') {
				throw new Error(nestNode.message);
			}
			if (nestNode.propertyType in primitiveTypesMap) {
				const coercer = getCoercer({
					isNested: true,
					primitiveType: primitiveTypesMap[nestNode.propertyType],
					propertyType,
				});
				const coercion = coercer(nestNode, { hasMany });
				if (coercion.valid) {
					coercedValues[nestNode.key] = dropHtmlComment(
						coercion.value,
					);
				} else {
					throw new Error(coercion.value);
				}
			}

			if (nestNode.propertyType in enums) {
				const [{ value }] = nestNode.children;

				const enumName = nestNode.propertyType;

				const validEnumValues = Object.values(enums[enumName]);
				const values = Array.isArray(value) ? value : [value];
				const invalidValues = values.filter(
					v => !validEnumValues.includes(v),
				);
				if (invalidValues.length === 0) {
					coercedValues[nestNode.key] = value;
				} else {
					throw new Error(
						`${invalidValues} is not a valid value for the enum ${enumName}. Valid values: ${validEnumValues.toString()}`,
					);
				}
			}
			return coercedValues;
		}, {}),
	);
	setPropertyNodeValue(
		node,
		hasMany ? coercedProperties : coercedProperties[0],
	);
};

const coerceEnumPropertyValue = (node, { propertyType, enums }) => {
	const [subdocument] = node.children;
	const flattenedContent = normalizePropertyKey(
		flattenNodeToPlainString(subdocument),
	);

	const enumName = propertyType;

	const validValues = Object.values(enums[enumName]);

	const validValue = validValues.find(value => {
		return flattenedContent === normalizePropertyKey(value);
	});

	if (validValue) {
		setPropertyNodeValue(node, validValue);
	} else {
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

				coercePropertyValue(node, {
					primitiveType: primitiveTypesMap[node.propertyType],
					propertyType,
				});
			} else {
				try {
					coerceNestedPropertyValue(node, {
						primitiveTypesMap,
						hasMany,
						propertyType,
						enums,
					});
				} catch (error) {
					convertNodeToProblem({
						node,
						message: error.message,
					});
					// remove all children in order to prevent to evaluate on schema validator
					node.children = [];
				}
			}
			return;
		}

		// If it's an enum, make sure it's a valid value for that enum
		if (propertyType in enums) {
			coerceEnumPropertyValue(node, {
				propertyType,
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
