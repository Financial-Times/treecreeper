const { stripIndents } = require('common-tags');
const httpErrors = require('http-errors');
const schema = require('../../../../../packages/schema-sdk');
const { executeQuery } = require('./neo4j-model');

const ERROR_RX = Object.freeze({
	nodeExists: /already exists with label/,
	nodeAttached: /Cannot delete node<\d+>, because it still has relationships/,
	// note - extra spaces are not a typo - the error message really does have 3 spaces
	missingRelated: /Failed to create relationship ` {2}relationship@(\d+)`, node ` {2}related@(\d+)` is missing./,
	missingRelationshipEndpoint: /Expected to find a node at ([a-zA-Z]+) but found nothing/,
});

const handleMissingRelationshipNode = (
	err,
	{ nodeType, code, relatedCode, relatedType },
) => {
	const missingProperty = (ERROR_RX.missingRelationshipEndpoint.exec(
		err.message,
	) || [])[1];

	if (missingProperty === 'node') {
		throw httpErrors(
			400,
			`Cannot create relationship: start node ${nodeType} ${code} does not exist.`,
		);
	} else if (missingProperty === 'relatedNode') {
		throw httpErrors(
			400,
			`Cannot create relationship: start node ${relatedType} ${relatedCode} does not exist.`,
		);
	}
};

const handleUpsertError = err => {
	if (ERROR_RX.missingRelated.test(err.message)) {
		throw httpErrors(
			400,
			stripIndents`Missing related node.
			If you need to create multiple things which depend on each other,
			use the \`upsert=true\` query string to create placeholder entries for
			related things which can be populated with properties with subsequent
			API calls.
			DO NOT use \`upsert\` if you are attempting to create a relationship with
			an item that already exists - there's probably a mistake somewhere in your
			code`,
		);
	}
};

const handleDuplicateNodeError = (err, nodeType, code) => {
	if (ERROR_RX.nodeExists.test(err.message)) {
		throw httpErrors(409, `${nodeType} ${code} already exists`);
	}
};

const handleDuplicateRelationship = async ({
	relationshipType,
	nodeType,
	code,
	relatedType,
	relatedCode,
}) => {
	const existingRelationship = await executeQuery(
		`
			MATCH (node:${nodeType} { code: $code })-[relationship:${relationshipType}]->(relatedNode:${relatedType} { code: $relatedCode })
			RETURN relationship
		`,
		{ code, relatedCode },
	);

	if (existingRelationship.records.length) {
		throw httpErrors(
			409,
			`relationship ${relationshipType} from ${nodeType} ${code} to ${relatedType} ${relatedCode} already exists`,
		);
	}
};

const handleMissingNode = ({ result, nodeType, code, status }) => {
	if (!result.records.length) {
		throw httpErrors(status, `${nodeType} ${code} does not exist`);
	}
};

const handleMissingRelationship = ({
	result,
	nodeType,
	code,
	relationship,
	relatedType,
	relatedCode,
	status,
}) => {
	if (!result.records.length) {
		throw httpErrors(
			status,
			`Relationship ${relationship} from ${nodeType} ${code} to ${relatedType} ${relatedCode} does not exist`,
		);
	}
};

const handleAttachedNode = ({ record, nodeType, code }) => {
	const typeSchema = schema.getType(nodeType);
	const relationshipsThatExist = Object.entries(typeSchema.properties)
		.map(([name, { isRelationship }]) => {
			if (isRelationship && record[name]) {
				return name;
			}
		})
		.filter(name => !!name);
	// use has so that get doesn't error, and get to check if null or not
	if (relationshipsThatExist.length) {
		throw httpErrors(
			409,
			`Cannot delete - ${nodeType} ${code} has relationships. Remove all ${relationshipsThatExist.join(
				', ',
			)} relationships before attempting to delete this record.`,
		);
	}
};

const handleRelationshipActionError = relationshipAction => {
	if (
		!relationshipAction ||
		!['merge', 'replace'].includes(relationshipAction)
	) {
		throw httpErrors(
			400,
			'PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`',
		);
	}
};

const toArray = val => (Array.isArray(val) ? val : [val]);

const handleSimultaneousWriteAndDelete = (content = {}) => {
	Object.entries(content)
		.filter(([propName]) => propName.startsWith('!'))
		.forEach(([propName, deletedCodes]) => {
			const addedCodes = toArray(content[propName.substr(1)]);
			deletedCodes = toArray(deletedCodes);
			if (deletedCodes.some(code => addedCodes.includes(code))) {
				throw httpErrors(
					400,
					'Trying to add and remove a relationship to a record at the same time',
				);
			}
		});
};

module.exports = {
	preflightChecks: {
		bailOnDuplicateRelationship: handleDuplicateRelationship,
		bailOnMissingRelationshipAction: handleRelationshipActionError,
		bailOnMissingNode: handleMissingNode,
		bailOnAttachedNode: handleAttachedNode,
		bailOnMissingRelationship: handleMissingRelationship,
		handleSimultaneousWriteAndDelete,
	},
	dbErrorHandlers: {
		nodeUpsert: handleUpsertError,
		duplicateNode: handleDuplicateNodeError,
		missingRelationshipNode: handleMissingRelationshipNode,
	},
};
