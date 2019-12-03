const visit = require('unist-util-visit-parents');
const propertyCoercers = require('../property-coercers');
const convertNodeToProblem = require('./convert-node-to-problem');
const normalizePropertyKey = require('../normalize-property-key');
const flattenNodeToPlainString = require('../flatten-node-to-plain-string');
const setPropertyNodeValue = require('./set-property-node-value');

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

module.exports = function coerceBizopsPropertiesToType({
	typeNames,
	systemProperties,
	primitiveTypesMap,
	enums,
}) {
	function mutate(node) {
		const { propertyType } = node;

		const { hasMany } = systemProperties[node.key];

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
				setPropertyNodeValue(node, coercion.value);
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
	};
};
