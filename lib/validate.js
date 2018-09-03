const getEnums = require('../methods/get-enums').method;
const getType = require('../methods/get-type').method;

const { stripIndents } = require('common-tags');

const filterWithError = (arr, filter, error) => {
	const result = arr.filter(filter);
	if (!result.length) {
		throw { bizOpsMessage: error };
	}
	return result;
};

const validateRelationship = ({
	nodeType,
	relatedType,
	relationshipType,
	relatedCode
}) => {
	let candidates = getType(nodeType, { relationshipStructure: 'flat' })
		.relationships;
	validateNodeType(nodeType);
	validateNodeType(relatedType);
	validateCode(relatedType, relatedCode);

	candidates = filterWithError(
		candidates,
		({ neo4jName }) => relationshipType === neo4jName,
		`${relationshipType} is not a valid relationship on ${nodeType}`
	);
	candidates = filterWithError(
		candidates,
		({ endNode }) => endNode === relatedType,
		`${relationshipType} is not a valid relationship between ${nodeType} and ${relatedType}`
	);

	filterWithError(
		candidates,
		({ direction }) => direction === 'outgoing',
		`${relationshipType} is not a valid relationship from ${nodeType} to ${relatedType}`
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

module.exports = {
	validateNodeType,
	validateRelationship,
	validateNodeAttributes,
	validateCode
};
