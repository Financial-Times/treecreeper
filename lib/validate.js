const getEnums = require('../methods/get-enums').method;
const getType = require('../methods/get-type').method;
const attributeNameRegex = /^[a-z][a-zA-Z\d]+$/;

const { stripIndents } = require('common-tags');

const findOrError = (candidates, ...filters) => {
	while (filters.length) {
		const [filter, message] = filters.shift();
		candidates = candidates.filter(filter);
		if (!candidates.length) {
			throw { bizOpsMessage: message };
		}
	}
};

const validateRelationship = ({
	nodeType,
	relatedType,
	relationshipType,
	relatedCode
}) => {
	validateNodeType(nodeType);
	validateNodeType(relatedType);
	validateCode(relatedType, relatedCode);

	const candidates = getType(nodeType, { relationshipStructure: 'flat' })
		.relationships;

	findOrError(candidates,
		[
			({ neo4jName }) => relationshipType === neo4jName,
			`${relationshipType} is not a valid relationship on ${nodeType}`
		],
		[
			({ endNode }) => endNode === relatedType,
			`${relationshipType} is not a valid relationship between ${nodeType} and ${relatedType}`
		],
		[
			({ direction }) => direction === 'outgoing',
			`${relationshipType} is not a valid relationship from ${nodeType} to ${relatedType}`
		]
	);
};

const validateNodeType = type => {
	if (!getType(type)) {
		throw { bizOpsMessage: `Invalid node type \`${type}\`` };
	}
};

const validateNodeAttributes = (typeName, attributes, throwInfo) => {
	const typeSchema = getType(typeName);
	const enumsSchema = getEnums();
	Object.entries(typeSchema.properties).forEach(
		([propName, { pattern, type }]) => {
			if (propName in attributes) {
				const val = attributes[propName];

				if (type === 'Boolean') {
					if (typeof val !== 'boolean') {
						throw {
							bizOpsMessage: `Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must be a Boolean`
						};
					}
				} else if (type === 'Float') {
					if (!Number.isFinite(val)) {
						throw {
							bizOpsMessage: `Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must be a finite floating point number`
						};
					}
				} else if (type === 'Int') {
					if (!Number.isFinite(val) || Math.round(val) !== val) {
						throw {
							bizOpsMessage: `Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must be a finite integer`
						};
					}
				} else if (type === 'String') {
					if (typeof val !== 'string') {
						throw {
							bizOpsMessage: `Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must be a string`
						};
					}
					if (pattern && !pattern.test(val)) {
						if (throwInfo) {
							throw { pattern };
						}
						throw {
							bizOpsMessage: `Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must match pattern ${pattern}`
						};
					}
				} else if (type in Object.keys(enumsSchema)) {
					const validVals = Object.values(enumsSchema[type]);
					if (!validVals.includes(val)) {
						throw {
							bizOpsMessage: `Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must be a valid enum: ${validVals.join(', ')}`
						};
					}
				}
			}
		}
	);
};

const validateCode = (type, code) => {
	try {
		validateNodeAttributes(type, { code }, true);
	} catch (err) {
		throw {
			bizOpsMessage: stripIndents`Invalid node identifier \`${code}\`. Must match pattern ${
				err.pattern
			}`
		};
	}
};

const validateAttributeNames = attributes => {
	const nonCamelCaseAttributeName = Object.keys(attributes).find(
		// FIXME: allow SF_ID as, at least for a while, we need this to exist so that
		// salesforce sync works during the transition to the new architecture
		name => name !== 'SF_ID' && !attributeNameRegex.test(name)
	);

	if (nonCamelCaseAttributeName) {
		throw {
			bizOpsMessage: `Invalid attribute ${nonCamelCaseAttributeName}. Must be a camelCase string, i.e.
			beginning with a lower case letter, and only containing upper and lower case letters
			and digits`
		};
	}
};

module.exports = {
	validateNodeType,
	validateRelationship,
	validateNodeAttributes,
	validateCode,
	validateAttributeNames
};
