const MAX_IN_SINGLE_QUERY = process.env.MAX_RELATIONSHIPS_IN_QUERY || 10;
const { createRelationships } = require('./cypher-fragments');

const batchRelationships = (relationships = []) => {
	if (relationships.length > MAX_IN_SINGLE_QUERY) {
		const sortedRelationships = relationships.sort(
			(
				{ relType: relType1, direction: direction1 },
				{ relType: relType2, direction: direction2 }
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
			RETURN node, relationship, related
			`;
		return { query, params };
	});
};

module.exports = {
	batchRelationships,
	constructRelationshipMergeQueries
};
