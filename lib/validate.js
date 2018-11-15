const getEnums = require('../methods/get-enums');
const getType = require('../methods/get-type');
const attributeNameRegex = /^[a-z][a-zA-Z\d]+$/;
const primitiveTypesMap = require('./primitive-types-map');
const { stripIndents } = require('common-tags');

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

const validateAttributes = (typeName, attributes, throwInfo) => {
	const typeSchema = getType(typeName);
	const enumsSchema = getEnums();
	Object.entries(typeSchema.properties).forEach(
		([propName, { validator, type }]) => {
			if (propName in attributes) {
				const val = attributes[propName];
				type = primitiveTypesMap[type] || type;
				if (type === 'Boolean') {
					if (typeof val !== 'boolean') {
						throw new BizOpsError(
							`Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must be a Boolean`
						);
					}
				} else if (type === 'Float') {
					if (!Number.isFinite(val)) {
						throw new BizOpsError(
							`Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must be a finite floating point number`
						);
					}
				} else if (type === 'Int') {
					if (!Number.isFinite(val) || Math.round(val) !== val) {
						throw new BizOpsError(
							`Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must be a finite integer`
						);
					}
				} else if (type === 'String') {
					if (typeof val !== 'string') {
						throw new BizOpsError(
							`Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must be a string`
						);
					}
					if (validator && !validator.test(val)) {
						if (throwInfo) {
							throw { validator };
						}
						throw new BizOpsError(
							`Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must match pattern ${validator}`
						);
					}
				} else if (type in enumsSchema) {
					const validVals = Object.values(enumsSchema[type]);
					if (!validVals.includes(val)) {
						throw new BizOpsError(
							`Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must be a valid enum: ${validVals.join(', ')}`
						);
					}
				}
			}
		}
	);
};

const validateCode = (type, code) => {
	try {
		validateAttributes(type, { code }, true);
	} catch (err) {
		const errorDetails = err.validator
			? `Must match pattern ${err.validator}`
			: err.message;
		throw new BizOpsError(
			stripIndents`Invalid node identifier \`${code}\`. ${errorDetails}`
		);
	}
};

const validateAttributeNames = attributes => {
	const nonCamelCaseAttributeName = Object.keys(attributes).find(
		// FIXME: allow SF_ID as, at least for a while, we need this to exist so that
		// salesforce sync works during the transition to the new architecture
		name => name !== 'SF_ID' && !attributeNameRegex.test(name)
	);

	if (nonCamelCaseAttributeName) {
		throw new BizOpsError(
			`Invalid attribute ${nonCamelCaseAttributeName}. Must be a camelCase string, i.e.
			beginning with a lower case letter, and only containing upper and lower case letters
			and digits`
		);
	}
};

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
	validateAttributes,
	validateRelationship,
	validateCode,
	validateAttributeNames,
	BizOpsError
};