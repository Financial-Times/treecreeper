const { stripIndents } = require('common-tags');
const logger = require('@financial-times/n-logger').default;
const { session: db } = require('../db-connection');
const errors = require('./errors');
const { logChanges } = require('./kinesis');
const { sanitizeInput, constructOutput } = require('./data-manipulation');

const {
	RETURN_NODE_WITH_RELS,
	upsertRelationshipQuery,
	createRelationshipQuery
} = require('./cypher');

const checkIfDeleted = async (nodeType, code) => {
	const result = await db.run(stripIndents`
	MATCH (node:${nodeType} { id: "${code}", isDeleted: true})
	RETURN node`);

	return !!result.records[0];
};

const create = async input => {
	const {
		requestId,
		upsert,
		nodeType,
		code,
		attributes,
		relationships
	} = sanitizeInput(input, 'CREATE');

	if (await checkIfDeleted(nodeType, code)) {
		errors.handleDeletedNode({ nodeType, code, status: 409 });
	}

	try {
		const queryParts = [`CREATE (node:${nodeType} $attributes)`];
		if (relationships.length) {
			const mapFunc = upsert
				? upsertRelationshipQuery
				: createRelationshipQuery;
			queryParts.push(
				...relationships.map((rel, i) =>
					mapFunc(Object.assign({ requestId, i }, rel))
				)
			);
		}
		queryParts.push(RETURN_NODE_WITH_RELS);

		const query = queryParts.join('\n');

		logger.info({
			event: 'CREATE_NODE_QUERY',
			requestId,
			nodeType,
			code,
			query
		});
		const result = await db.run(query, { attributes });

		logChanges(requestId, result);

		return constructOutput(result);
	} catch (err) {
		errors.handleDuplicateNodeError(err, nodeType, code);
		errors.handleUpsertError(err, relationships);
		throw err;
	}
};

const read = async input => {
	const { requestId, nodeType, code } = sanitizeInput(input, 'READ');
	if (await checkIfDeleted(nodeType, code)) {
		errors.handleDeletedNode({ nodeType, code, status: 410 });
	}
	const query = stripIndents`
	MATCH (node:${nodeType} { id: $code })
	${RETURN_NODE_WITH_RELS}`;

	logger.info({ event: 'READ_NODE_QUERY', requestId, nodeType, code, query });

	const result = await db.run(query, { code });
	errors.handleMissingNode({ result, nodeType, code, status: 404 });
	return constructOutput(result);
};

const update = async input => {
	const {
		requestId,
		// upsert,
		nodeType,
		code,
		attributes,
		relationships,
		deletedAttributes
	} = sanitizeInput(input, 'UPDATE');

	if (await checkIfDeleted(nodeType, code)) {
		errors.handleDeletedNode({ nodeType, code, status: 409 });
	}

	try {
		const queryParts = [
			`MERGE (node:${nodeType} {id: "${code}"})
				ON CREATE SET node.createdByRequest = "${requestId}"
			SET node += $attributes
		`
		];

		queryParts.push(...deletedAttributes.map(attr => `REMOVE node.${attr}`));

		if (relationships.length) {
			throw { status: 400, message: 'PATCHing relationships not yet defined' };
			// if (upsert) {
			// 	queryParts.push(
			// 		...relationships.map(rel =>
			// 			upsertRelationshipQuery(Object.assign({ requestId }, rel))
			// 		)
			// 	);
			// } else {
			// 	queryParts.push(
			// 		...relationships.map((rel, i) =>
			// 			createRelationshipQuery(Object.assign({ requestId, i }, rel))
			// 		)
			// 	);
			// }
			// queryParts.push(
			// 	stripIndents`WITH node
			// 	MATCH (node)-[relationship]-(related)
			// 	RETURN node, relationship, related`
			// );
		}
		queryParts.push(RETURN_NODE_WITH_RELS);

		const query = queryParts.join('\n');

		logger.info({
			event: 'UPDATE_NODE_QUERY',
			requestId,
			nodeType,
			code,
			query,
			attributes
		});
		const result = await db.run(query, { attributes });
		logChanges(requestId, result);
		// TODO pass on the 201
		return {
			data: constructOutput(result),
			status:
				result.records[0].get('node').properties.createdByRequest === requestId
					? 201
					: 200
		};
	} catch (err) {
		errors.handleUpsertError(err, relationships);
		throw err;
	}
};

const remove = async input => {
	const { requestId, nodeType, code } = sanitizeInput(input, 'DELETE');
	if (await checkIfDeleted(nodeType, code)) {
		errors.handleDeletedNode({ nodeType, code, status: 410 });
	}
	const record = await read(input);

	if (Object.keys(record.relationships).length) {
		errors.handleAttachedNode({ record, nodeType, code });
	}

	const query = stripIndents`
	MATCH (node:${nodeType} { id: $code })
	SET node.isDeleted = true, node.deletedByRequest = "${requestId}"
	RETURN node`;

	logger.info({ event: 'REMOVE_NODE_QUERY', requestId, nodeType, code, query });

	const result = await db.run(query, { code });
	errors.handleMissingNode({ result, nodeType, code, status: 404 });
	logChanges(requestId, result);

	return { data: '', status: 204 };
};

module.exports = { create, read, update, delete: remove };
