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

const coerceEnumPropertyValue = (
	node,
	{ propertyType: enumName, hasMany, enums },
) => {
	let [subdocument] = node.children;
	const validValues = Object.values(enums[enumName]);
	if (!subdocument.children.length) {
		return convertNodeToProblem({
			node,
			message: `Must provide a value. Valid values: ${validValues.toString()}`,
		});
	}
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

	const values = subdocument.children.map(child => {
		const flattenedContent = normalizePropertyKey(
			flattenNodeToPlainString(child),
		);
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

const coerceNestedPropertyValue = (
	node,
	{ primitiveTypesMap, hasMany, propertyType, enums },
) => {
	try {
		const coercedProperties = node.children.map(subdocument =>
			// eslint-disable-next-line array-callback-return
			subdocument.children.reduce((values, nestNode) => {
				if (nestNode.type === 'problem') {
					throw new Error(nestNode.message);
				}

				const primitiveType = primitiveTypesMap[nestNode.propertyType];
				if (primitiveType) {
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
				}

				if (enums[nestNode.propertyType]) {
					coerceEnumPropertyValue(nestNode, { ...nestNode, enums });
					values[nestNode.key] = nestNode.value;
					return values;
				}
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

		if (isNested) {
			return coerceNestedPropertyValue(node, {
				primitiveTypesMap,
				hasMany,
				propertyType,
				enums,
			});
		}

		if (propertyType in primitiveTypesMap) {
			const isEmpty = !flattenNodeToPlainString(node);

			if (isEmpty) {
				return convertNodeToProblem({
					node,
					message: `property "${node.key}" has no value`,
				});
			}

			return coerceNonNestedPropertyValue(node, {
				primitiveType: primitiveTypesMap[node.propertyType],
				propertyType,
			});
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
			message: `Could not resolve ${node.propertyType} to a valid property type or enum`,
		});
	}

	return function transform(tree) {
		selectAll(':root > property', tree).forEach(mutate);
		return omitEmptyPropertyNode(tree);
	};
};
