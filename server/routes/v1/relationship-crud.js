const { stripIndents } = require('common-tags');
const { logger } = require('../../lib/request-context');
const { executeQuery } = require('../../data/db-connection');
const {
	dbErrorHandlers,
	queryResultHandlers,
	preflightChecks
} = require('./helpers/errors');
const {
	metaAttributesForCreate,
	metaAttributesForUpdate
} = require('../../data/cypher-fragments');
const {
	logRelationshipChanges: logChanges
} = require('./helpers/log-to-kinesis');
const {
	sanitizeRelationship: sanitizeInput
} = require('./helpers/sanitize-input');
const {
	constructRelationship: constructOutput
} = require('./helpers/construct-output');

const create = async input => {
	const sanitizedInput = sanitizeInput(input, 'CREATE');
	const {
		requestId,
		clientId,
		nodeType,
		code,
		attributes,
		relatedType,
		relatedCode,
		relationshipType
	} = sanitizedInput;

	await preflightChecks.bailOnDuplicateRelationship(sanitizedInput);

	try {
		const date = new Date().toUTCString();
		const query = stripIndents`
			OPTIONAL MATCH (node:${nodeType} { code: $code }), (relatedNode:${relatedType} { code: $relatedCode })
			MERGE (node)-[relationship:${relationshipType}]->(relatedNode)
			ON CREATE SET
				${metaAttributesForCreate('relationship')},
				relationship += $attributes
			RETURN relationship`;
		logger.info(
			Object.assign(
				{
					event: 'CREATE_RELATIONSHIP_QUERY',
					query
				},
				input
			)
		);
		const result = await executeQuery(query, {
			attributes,
			clientId,
			requestId,
			code,
			relatedCode,
			date
		});
		logChanges(requestId, clientId, result, sanitizedInput);
		return constructOutput(result);
	} catch (err) {
		dbErrorHandlers.missingRelationshipNode(err, sanitizedInput);
		throw err;
	}
};

const read = async input => {
	const {
		requestId,
		nodeType,
		code,
		relatedType,
		relatedCode,
		relationshipType
	} = sanitizeInput(input, 'READ');

	const query = stripIndents`
	MATCH (node:${nodeType} { code: $code })-[relationship:${relationshipType}]->(related:${relatedType} { code: $relatedCode })
	RETURN relationship`;

	logger.info({ event: 'READ_RELATIONSHIP_QUERY', requestId, query });
	const result = await executeQuery(query, { code, relatedCode });
	queryResultHandlers.missingRelationship(
		Object.assign({ result, status: 404 }, input)
	);
	return constructOutput(result);
};

const update = async input => {
	const sanitizedInput = sanitizeInput(input, 'UPDATE');
	const {
		requestId,
		clientId,
		nodeType,
		code,
		attributes,
		deletedAttributes,
		relatedType,
		relatedCode,
		relationshipType
	} = sanitizedInput;

	try {
		const date = new Date().toUTCString();

		const queryParts = [
			// OPTIONAL MATCH needed in order to throw error which will help us
			// identify which, if any, node is missing
			stripIndents`OPTIONAL MATCH (node:${nodeType} { code: $code }), (relatedNode:${relatedType} { code: $relatedCode })
			MERGE (node)-[relationship:${relationshipType}]->(relatedNode)
			ON CREATE SET
				${metaAttributesForCreate('relationship')},
				relationship += $attributes
			ON MATCH SET
				${metaAttributesForUpdate('relationship')},
				relationship += $attributes`
		];
		if (deletedAttributes.length) {
			queryParts.push(
				...deletedAttributes.map(attr => `REMOVE relationship.${attr}`)
			);
			queryParts.push('WITH relationship');
		}
		queryParts.push('RETURN relationship');

		const query = queryParts.join('\n');
		logger.info(
			Object.assign(
				{
					event: 'UPDATE_RELATIONSHIP_QUERY',
					query
				},
				input
			)
		);

		const result = await executeQuery(query, {
			attributes,
			clientId,
			requestId,
			code,
			relatedCode,
			date
		});

		logChanges(requestId, clientId, result, sanitizedInput);

		return {
			data: constructOutput(result),
			status:
				result.records[0].get('relationship').properties._createdByRequest ===
				requestId
					? 201
					: 200
		};
	} catch (err) {
		dbErrorHandlers.missingRelationshipNode(err, sanitizedInput);
		throw err;
	}
};

const remove = async input => {
	const sanitizedInput = sanitizeInput(input, 'DELETE');
	const {
		requestId,
		clientId,
		nodeType,
		code,
		relatedType,
		relatedCode,
		relationshipType
	} = sanitizedInput;

	// this will error with a 404 if the node does not exist
	// note - this calls bailOnDeletedNode, which is why it isn't done explicitly
	// in this function
	await read(input);

	const query = stripIndents`
	MATCH (node:${nodeType} { code: $code })-[relationship:${relationshipType}]->(related:${relatedType} { code: $relatedCode })
	DELETE relationship`;

	logger.info({ event: 'REMOVE_RELATIONSHIP_QUERY', requestId, query });
	const result = await executeQuery(query, { code, relatedCode });
	logChanges(requestId, clientId, result, sanitizedInput);
	return { status: 204 };
};

module.exports = {
	create,
	read,
	update,
	delete: remove
};
