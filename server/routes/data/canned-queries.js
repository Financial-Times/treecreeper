const { executeQuery } = require('../../data/db-connection');
const { RETURN_NODE_WITH_RELS } = require('./cypher-fragments');

module.exports = {
	getNodeWithRelationships: (nodeType, code) =>
		executeQuery(
			`MATCH (node:${nodeType} {code: $code})
			${RETURN_NODE_WITH_RELS}`,
			{ code }
		)
};
