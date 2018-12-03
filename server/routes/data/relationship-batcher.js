const MAX_IN_SINGLE_QUERY = process.env.MAX_RELATIONSHIPS_IN_QUERY || 10;
const {
	RETURN_NODE_WITH_RELS,
	createRelationships
} = require('./cypher-fragments');
const { getType } = require('@financial-times/biz-ops-schema');
const { getNodeWithRelationships } = require('./canned-queries');
const { executeQuery, writeTransaction } = require('../../data/db-connection');
const { constructNode: constructOutput } = require('../lib/construct-output');

const explodeRelationships = (type, relationships = {}) => {
	const schema = getType(type);
	return [].concat(
		...Object.entries(relationships).map(([propName, code]) => {
			const codes = Array.isArray(code) ? code : [code];
			return codes.map(code =>
				Object.assign({ code }, schema.properties[propName])
			);
		})
	);
};

const batchRelationships = (type, relationships) => {
	relationships = explodeRelationships(type, relationships);
	if (relationships.length > MAX_IN_SINGLE_QUERY) {
		const sortedRelationships = relationships.sort(
			(
				{ relationship: relType1, direction: direction1 },
				{ relationship: relType2, direction: direction2 }
			) => {
				return relType1 > relType2
					? -1
					: relType1 < relType2
						? 1
						: direction1 > direction2
							? -1
							: direction1 < direction2
								? 1
								: 0;
			}
		);

		const batches = [];
		while (sortedRelationships.length) {
			batches.push(sortedRelationships.splice(0, MAX_IN_SINGLE_QUERY));
		}

		return batches;
	}
	return [relationships];
};

const constructRelationshipMergeQueries = (
	upsert,
	batchedRelationships,
	nodeType,
	parameters
) => {
	return batchedRelationships.map(rels => {
		const params = Object.assign({}, parameters);
		const query = `
		MATCH (node:${nodeType} {code: $code})
			${createRelationships(upsert, rels, params)}
			RETURN node
			`;
		return { query, params };
	});
};

const getBatchedQueries = ({
	baseParameters,
	writeAttributes,
	nodeType,
	upsert,
	writeRelationships,
	initialQueryParts
}) => {
	const parameters = Object.assign(
		{
			attributes: writeAttributes
		},
		baseParameters
	);

	const batchedRelationships = batchRelationships(nodeType, writeRelationships);
	const initialQueryRelationships = batchedRelationships[0];

	initialQueryParts.push(
		createRelationships(upsert, initialQueryRelationships, parameters)
	);

	initialQueryParts.push(RETURN_NODE_WITH_RELS);

	const firstQuery = {
		query: initialQueryParts.join('\n'),
		params: parameters
	};

	if (batchedRelationships.length > 1) {
		return [
			firstQuery,
			// nested array rather than concatenated because supplementaryQueries
			// can all run in parallel
			constructRelationshipMergeQueries(
				upsert,
				batchedRelationships.slice(1),
				nodeType,
				baseParameters
			)
		];
	} else {
		return firstQuery;
	}
};

const executeBatchOrSingle = async (
	queries,
	nodeType,
	code,
	willDeleteRelationships = false
) => {
	let result;
	if (Array.isArray(queries)) {
		await writeTransaction(queries);
		result = await getNodeWithRelationships(nodeType, code);
	} else {
		result = await executeQuery(queries.query, queries.params);
		// In _theory_ we could return the above all the time (it works most of the time)
		// but behaviour when deleting relationships is confusing, and difficult to
		// obtain consistent results, so for safety do a fresh get when deletes are involved
		if (willDeleteRelationships) {
			result = await getNodeWithRelationships(nodeType, code);
		}
	}

	return { neo4jResponse: result, data: constructOutput(nodeType, result) };
};

module.exports = {
	executeBatchOrSingle,
	getBatchedQueries,
	batchRelationships,
	constructRelationshipMergeQueries
};
