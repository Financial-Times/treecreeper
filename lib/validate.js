const relationshipsSchema = require('./raw-data').getRelationships();
const enumsSchema = require('./raw-data').getEnums();
const getType = require('../methods/get-type').method;

const { stripIndents } = require('common-tags');

const filterWithError = (arr, filter, error) => {
	const result = arr.filter(filter);
	if (!result.length) {
		throw {bizOpsMessage: error};
	}
	return result;
};

const validateRelationship = ({
	nodeType,
	relatedType,
	relationshipType,
	relatedCode
}) => {
	let candidates = getType(nodeType, {withNeo4jRelationships: true}).relationships;
	validateNodeType(nodeType);
	validateNodeType(relatedType);
	validateCode(relatedType, relatedCode);
	candidates = filterWithError(
		candidates,
		({ underlyingRelationship }) => relationshipType === underlyingRelationship,
		`${relationshipType} is not a valid relationship on ${nodeType}`
	);
	candidates = filterWithError(
		candidates,
		({ type }) => type === relatedType,
		`${relationshipType} is not a valid relationship between ${nodeType} and ${relatedType}`
	);

	filterWithError(
		candidates,
		({ direction }) => direction === 'OUT',
		`${relationshipType} is not a valid relationship from ${nodeType} to ${relatedType}`
	);
};

const validateNodeType = type => {
	if (!getType(type)) {
		throw {bizOpsMessage: `Invalid node type \`${type}\``};
	}
};

const validateNodeAttributes = (type, attributes, throwInfo) => {
	const typeSchema = getType(type);
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
					pattern && console.log({ propName, pattern, type, theType: typeSchema.name })
					if (pattern && !pattern.test(val)) {
						if (throwInfo) {
							throw { pattern };
						}
						throw {
							bizOpsMessage: `Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must match pattern ${pattern}`
						};
					}
				} else if (type in enumsSchema) {
					const validVals = Array.isArray(enumsSchema[type].options)
						? enumsSchema[type].options
						: Object.values(enumsSchema[type].options);
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
		console.log({err})
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
