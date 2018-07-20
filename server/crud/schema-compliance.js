const {
	relationshipsSchema,
	typesSchema,
	enumsSchema
} = require('../../schema');
const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const typesSchemaMap = typesSchema.reduce(
	(map, type) => Object.assign(map, { [type.name]: type }),
	{}
);

const filterWithError = (arr, filter, error) => {
	const result = arr.filter(filter);
	if (!result.length) {
		throw httpErrors(400, error);
	}
	return result;
};

const validateRelationship = ({
	nodeType,
	relatedType,
	relationshipType,
	relatedCode
}) => {
	let candidates = relationshipsSchema[nodeType];
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
	if (!typesSchemaMap[type]) {
		throw httpErrors(400, `Invalid node type \`${type}\``);
	}
};

const validateNodeAttributes = (type, attributes, throwInfo) => {
	const typeSchema = typesSchemaMap[type];
	Object.entries(typeSchema.properties).forEach(
		([propName, { pattern, type }]) => {
			if (propName in attributes) {
				const val = attributes[propName];
				if (type === 'Boolean') {
					if (typeof val !== 'boolean') {
						throw httpErrors(
							400,
							`Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must be a Boolean`
						);
					}
				} else if (type === 'Float') {
					if (!Number.isFinite(val)) {
						throw httpErrors(
							400,
							`Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must be a finite floating point number`
						);
					}
				} else if (type === 'Int') {
					if (!Number.isFinite(val) || Math.round(val) !== val) {
						throw httpErrors(
							400,
							`Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must be a finite integer`
						);
					}
				} else if (type === 'String') {
					if (typeof val !== 'string') {
						throw httpErrors(
							400,
							`Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must be a string`
						);
					}
					if (pattern && !pattern.test(val)) {
						if (throwInfo) {
							throw { pattern };
						}
						throw httpErrors(
							400,
							`Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must match pattern ${pattern}`
						);
					}
				} else if (type in enumsSchema) {
					if (!enumsSchema[type].options.includes(val)) {
						throw httpErrors(
							400,
							`Invalid value \`${val}\` for property \`${propName}\` on type \`${type}\`.
						Must be a valid enum: ${enumsSchema[type].options.join(', ')}`
						);
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
		throw httpErrors(
			400,
			stripIndents`Invalid node identifier \`${code}\`. Must match pattern ${
				err.pattern
			}`
		);
	}
};

module.exports = {
	validateNodeType,
	validateRelationship,
	validateNodeAttributes,
	validateCode
};
