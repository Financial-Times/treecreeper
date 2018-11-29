const getEnums = require('../methods/get-enums');
const getType = require('../methods/get-type');
const attributeNameRegex = /^[a-z][a-zA-Z\d]+$/;
const primitiveTypesMap = require('./primitive-types-map');
const { stripIndents } = require('common-tags');

const toArray = value => Array.isArray(value) ? value : [value];

class BizOpsError {
	constructor(message) {
		this.message = message;
	}
}

const validateTypeName = type => {
	if (!getType(type)) {
		throw new BizOpsError(`Invalid node type \`${type}\``);
	}
};

const validateAttribute = (typeName, attributeName, attributeValue) => {
	const attributeDefinition = getType(typeName).properties[attributeName];
	if (!attributeDefinition) {
		throw new BizOpsError(`Invalid property \`${attributeName}\` on type \`${typeName}\`.`);
	}

	if (attributeValue === null) {
		return;
	}

	let { validator, type, relationship } = attributeDefinition

	type = primitiveTypesMap[type] || type;

	if (type === 'Boolean') {
		if (typeof attributeValue !== 'boolean') {
			throw new BizOpsError(
				`Invalid attributeValue \`${attributeValue}\` for property \`${attributeName}\` on type \`${typeName}\`.
			Must be a Boolean`
			);
		}
	} else if (type === 'Float') {
		if (!Number.isFinite(attributeValue)) {
			throw new BizOpsError(
				`Invalid attributeValue \`${attributeValue}\` for property \`${attributeName}\` on type \`${typeName}\`.
			Must be a finite floating point number`
			);
		}
	} else if (type === 'Int') {
		if (!Number.isFinite(attributeValue) || Math.round(attributeValue) !== attributeValue) {
			throw new BizOpsError(
				`Invalid attributeValue \`${attributeValue}\` for property \`${attributeName}\` on type \`${typeName}\`.
			Must be a finite integer`
			);
		}
	} else if (type === 'String') {
		if (typeof attributeValue !== 'string') {
			throw new BizOpsError(
				`Invalid attributeValue \`${attributeValue}\` for property \`${attributeName}\` on type \`${typeName}\`.
			Must be a string`
			);
		}
		if (validator && !validator.test(attributeValue)) {
			throw new BizOpsError(
				`Invalid attributeValue \`${attributeValue}\` for property \`${attributeName}\` on type \`${typeName}\`.
			Must match pattern ${validator}`
			);
		}
	} else if (type in getEnums()) {
		const validVals = Object.values(getEnums()[type]);
		if (!validVals.includes(attributeValue)) {
			throw new BizOpsError(
				`Invalid attributeValue \`${attributeValue}\` for property \`${attributeName}\` on type \`${typeName}\`.
			Must be a valid enum: ${validVals.join(', ')}`
			);
		}
	// validate related codes
	} else if (relationship) {
		toArray(attributeValue)
			.map(value => validateAttribute(type, 'code', value))
	}
}

const validateAttributes = (typeName, attributes) =>
	Object.entries(attributes).forEach(([propName, value]) => validateAttribute(typeName, propName, value))


const validateCode = (type, code) => validateAttribute(type, 'code', code);

const validateAttributeName = name => {
	// FIXME: allow SF_ID as, at least for a while, we need this to exist so that
	// salesforce sync works during the transition to the new architecture
	if (name !== 'SF_ID' && !attributeNameRegex.test(name)) {
		throw new BizOpsError(
			`Invalid attribute ${name}. Must be a camelCase string, i.e.
			beginning with a lower case letter, and only containing upper and lower case letters
			and digits`
		);
	}
};

const validateAttributeNames = attributes => Object.keys(attributes).map(validateAttributeName);

const findOrError = (candidates, ...filters) => {
	while (filters.length) {
		const [filter, message] = filters.shift();
		candidates = candidates.filter(filter);
		if (!candidates.length) {
			throw new BizOpsError(message);
		}
	}
};

const validateRelationship = ({
	nodeType,
	relatedType,
	relationshipType,
	relatedCode
}) => {
	validateTypeName(nodeType);

	const candidates = Object.values(getType(nodeType).properties).filter(
		({ relationship }) => !!relationship
	);

	findOrError(
		candidates,
		[
			({ relationship }) => relationshipType === relationship,
			`${relationshipType} is not a valid relationship on ${nodeType}`
		],
		[
			({ type }) => type === relatedType,
			`${relationshipType} is not a valid relationship between ${nodeType} and ${relatedType}`
		],
		[
			({ direction }) => direction === 'outgoing',
			`${relationshipType} is not a valid relationship from ${nodeType} to ${relatedType}`
		]
	);

	validateCode(relatedType, relatedCode);
	validateTypeName(relatedType);
};

module.exports = {
	validateTypeName,
	validateAttribute,
	validateAttributeName,
	validateAttributes,
	validateAttributeNames,
	validateRelationship,
	validateCode,
	BizOpsError
};
