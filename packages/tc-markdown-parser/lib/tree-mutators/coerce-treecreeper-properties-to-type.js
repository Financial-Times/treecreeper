const visit = require('unist-util-visit-parents');
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
	const isString = isNested || (primitiveType === 'String' && !isSubdocument);

	if (isNested || isString) {
		return propertyCoercers.String;
	}

	if (isSubdocument) {
		return propertyCoercers.Subdocument;
	}

	return propertyCoercers[primitiveType];
}

module.exports = function coerceTreecreeperPropertiesToType({
	typeNames,
	properties,
	primitiveTypesMap,
	enums,
}) {
	function mutate(node) {
		const { propertyType } = node;

		const { hasMany } = properties[node.key];

		// If we come across a main type (such as System), then in the markdown
		// we will specify only a code
		const isNested = typeNames.has(node.propertyType);

		const isEmpty = !flattenNodeToPlainString(node);

		if (isEmpty) {
			convertNodeToProblem({
				node,
				message: `property "${node.key}" has no value`,
			});

			return;
		}

		// If the propertyType is nested, or one of the primitive types, coerce it
		if (propertyType in primitiveTypesMap || isNested) {
			const [subdocument] = node.children;

			const primitiveType = primitiveTypesMap[node.propertyType];

			const coercer = getCoercer({
				isNested,
				primitiveType,
				propertyType,
			});

			const coercion = coercer(subdocument, { hasMany });

			if (coercion.valid) {
				setPropertyNodeValue(node, dropHtmlComment(coercion.value));
			} else {
				convertNodeToProblem({
					node,
					message: coercion.value,
				});
			}

			return;
		}

		// If it's an enum, make sure it's a valid value for that enum
		if (propertyType in enums) {
			const flattenedContent = normalizePropertyKey(
				flattenNodeToPlainString(node.children[0]),
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

			return;
		}

		convertNodeToProblem({
			node,
			message: `i couldn't resolve ${node.propertyType} to a valid biz-ops property type or enum`,
		});
	}

	return function transform(tree) {
		visit(tree, 'property', mutate);
		return omitEmptyPropertyNode(tree);
	};
};
