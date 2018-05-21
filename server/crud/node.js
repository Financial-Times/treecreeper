const { stripIndents } = require('common-tags');
const logger = require('@financial-times/n-logger').default;
const { session: db } = require('../db-connection');
const {
	handleUpsertError,
	handleDuplicateNodeError,
	handleMissingNode
} = require('./errors');
const { logChanges } = require('./kinesis');
const { sanitizeInput, constructOutput } = require('./data-manipulation');

const {
	RETURN_NODE_WITH_RELS,
	upsertRelationshipQuery,
	createRelationshipQuery
} = require('./cypher');

const get = async input => {
	const { requestId, nodeType, code } = sanitizeInput(input, 'READ');

	const query = stripIndents`
	MATCH (node:${nodeType} { id: $code })
	${RETURN_NODE_WITH_RELS}`;

	logger.info({ requestId, query });

	const result = await db.run(query, { code });
	handleMissingNode({ result, nodeType, code, status: 404 });
	return constructOutput(result);
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

		logger.info({ requestId, query });
		const result = await db.run(query, { attributes });

		logChanges(requestId, result);

		return constructOutput(result);
	} catch (err) {
		handleDuplicateNodeError(err, nodeType, code);
		handleUpsertError(err, relationships);
		throw err;
	}
};

const update = async input => {
	const {
		requestId,
		// upsert,
		nodeType,
		code,
		attributes,
		relationships
	} = sanitizeInput(input, 'UPDATE');

	try {
		const queryParts = [
			`MERGE (node:${nodeType} {id: "${code}"})
				ON CREATE SET node.createdByRequest = "${requestId}"
			SET node += $attributes
		`
		];

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

		logger.info({ requestId, query, attributes });
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
		handleUpsertError(err, relationships);
		throw err;
	}
};

module.exports = { get, create, update }; //, _createRelationships, update, remove, getAll, getAllforOne };
