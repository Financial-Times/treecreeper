const { relationshipsSchema, typesSchema } = require('../../schema');
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
	Object.entries(typeSchema.properties).forEach(([propName, { pattern }]) => {
		if (
			pattern &&
			attributes[propName] &&
			!pattern.test(attributes[propName])
		) {
			if (throwInfo) {
				throw { pattern };
			}
			throw httpErrors(
				400,
				`Invalid value \`${
					attributes[propName]
				}\` for property \`${propName}\` on type \`${type}\`.
				Must match pattern ${pattern}`
			);
		}
	});
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
