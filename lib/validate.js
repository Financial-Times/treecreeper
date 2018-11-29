const getEnums = require('../methods/get-enums');
const getType = require('../methods/get-type');
const propertyNameRegex = /^[a-z][a-zA-Z\d]+$/;
const primitiveTypesMap = require('./primitive-types-map');

const toArray = value => (Array.isArray(value) ? value : [value]);

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

const validateProperty = (typeName, propertyName, propertyValue) => {
	const propertyDefinition = getType(typeName).properties[propertyName];
	if (!propertyDefinition) {
		throw new BizOpsError(
			`Invalid property \`${propertyName}\` on type \`${typeName}\`.`
		);
	}

	if (propertyValue === null) {
		return;
	}

	const { validator, relationship } = propertyDefinition;
	const type =
		primitiveTypesMap[propertyDefinition.type] || propertyDefinition.type;

	if (type === 'Boolean') {
		if (typeof propertyValue !== 'boolean') {
			throw new BizOpsError(
				`Invalid value \`${propertyValue}\` for property \`${propertyName}\` on type \`${typeName}\`.
			Must be a Boolean`
			);
		}
	} else if (type === 'Float') {
		if (!Number.isFinite(propertyValue)) {
			throw new BizOpsError(
				`Invalid value \`${propertyValue}\` for property \`${propertyName}\` on type \`${typeName}\`.
			Must be a finite floating point number`
			);
		}
	} else if (type === 'Int') {
		if (
			!Number.isFinite(propertyValue) ||
			Math.round(propertyValue) !== propertyValue
		) {
			throw new BizOpsError(
				`Invalid value \`${propertyValue}\` for property \`${propertyName}\` on type \`${typeName}\`.
			Must be a finite integer`
			);
		}
	} else if (type === 'String') {
		if (typeof propertyValue !== 'string') {
			throw new BizOpsError(
				`Invalid value \`${propertyValue}\` for property \`${propertyName}\` on type \`${typeName}\`.
			Must be a string`
			);
		}
		if (validator && !validator.test(propertyValue)) {
			throw new BizOpsError(
				`Invalid value \`${propertyValue}\` for property \`${propertyName}\` on type \`${typeName}\`.
			Must match pattern ${validator}`
			);
		}
	} else if (type in getEnums()) {
		const validVals = Object.values(getEnums()[type]);
		if (!validVals.includes(propertyValue)) {
			throw new BizOpsError(
				`Invalid value \`${propertyValue}\` for property \`${propertyName}\` on type \`${typeName}\`.
			Must be a valid enum: ${validVals.join(', ')}`
			);
		}
		// validate related codes
	} else if (relationship) {
		toArray(propertyValue).map(value => validateProperty(type, 'code', value));
	}
};

const validateAttributes = (typeName, attributes) =>
	Object.entries(attributes).forEach(([propName, value]) =>
		validateProperty(typeName, propName, value)
	);

const validateCode = (type, code) => validateProperty(type, 'code', code);

const validatePropertyName = name => {
	// FIXME: allow SF_ID as, at least for a while, we need this to exist so that
	// salesforce sync works during the transition to the new architecture
	if (name !== 'SF_ID' && !propertyNameRegex.test(name)) {
		throw new BizOpsError(
			`Invalid property name \`${name}\`. Must be a camelCase string, i.e.
			beginning with a lower case letter, and only containing upper and lower case letters
			and digits`
		);
	}
};

const validateAttributeNames = attributes =>
	Object.keys(attributes).map(validatePropertyName);

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
	validateProperty,
	validatePropertyName,
	// mismatched names is because of a move to property as being what we call things
	// and the two methods below will be removed shortly
	validateAttributes,
	validateAttributeNames,
	validateRelationship,
	validateCode,
	BizOpsError
};
