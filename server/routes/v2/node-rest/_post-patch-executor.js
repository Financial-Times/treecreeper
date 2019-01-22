const { stripIndents } = require('common-tags');
const { getType } = require('@financial-times/biz-ops-schema');
const { logNodeChanges } = require('../../../lib/log-to-kinesis');
const { executeQuery } = require('../../../data/db-connection');
const cypherHelpers = require('../../../data/cypher-helpers');
const constructOutput = require('../../../data/construct-output');
const salesforceSync = require('../../../lib/salesforce-sync');

const annotateRelationships = (type, relationships = {}) => {
	const schema = getType(type);
	return [].concat(
		...Object.entries(relationships).map(([propName, codes]) => {
			codes = Array.isArray(codes) ? codes : [codes];
			return codes.map(code =>
				Object.assign({ code }, schema.properties[propName]),
			);
		}),
	);
};

const groupSimilarRelationships = relationships =>
	Object.entries(
		relationships.reduce((map, rel) => {
			const key = `${rel.relationship}:${rel.direction}:${rel.type}`;
			map[key] = map[key] || [];
			map[key].push(rel.code);
			return map;
		}, {}),
	).map(([key, codes]) => {
		const [relationship, direction, type] = key.split(':');
		return {
			key: key.replace(/:/g, ''),
			relationship,
			direction,
			type,
			codes,
		};
	});

const createRelationships = (upsert, relationships, globalParameters) => {
	const groupedRelationships = groupSimilarRelationships(relationships);

	// make sure the parameter referenced in the query exists on the
	// globalParameters object passed to the db driver
	groupedRelationships.map(({ key, codes }) =>
		Object.assign(globalParameters, { [key]: codes }),
	);

	// Note on the limitations of cypher:
	// It would be so nice to use UNWIND to create all these from a list parameter,
	// but unfortunately parameters cannot be used to specify relationship labels
	return `
${groupedRelationships
	.map(obj => {
		return stripIndents`
		WITH node
		${upsert ? cypherHelpers.mergeNode(obj) : cypherHelpers.optionalMatchNode(obj)}
		WITH node, related
		${cypherHelpers.mergeRelationship(obj)}
	`;
	})
	.join('\n')}`;
};

module.exports = async ({
	parameters,
	queryParts,
	writeRelationships,
	method,
	nodeType,
	upsert,
	removedRelationships,
	willDeleteRelationships,
}) => {
	queryParts.push(
		createRelationships(
			upsert,
			annotateRelationships(nodeType, writeRelationships),
			parameters,
		),
	);

	queryParts.push(cypherHelpers.RETURN_NODE_WITH_RELS);

	let result = await executeQuery(queryParts.join('\n'), parameters);
	// In _theory_ we could return the above all the time (it works most of the time)
	// but behaviour when deleting relationships is confusing, and difficult to
	// obtain consistent results, so for safety do a fresh get when deletes are involved
	if (willDeleteRelationships) {
		result = await cypherHelpers.getNodeWithRelationships(
			nodeType,
			parameters.code,
		);
	}
	const responseData = constructOutput(nodeType, result);

	// HACK: While salesforce also exists as a rival source of truth for Systems,
	// we sync with it here. Don't like it being in here as the api should be agnostic
	// in how it handles types, but a little hack in here feels preferable to managing
	// another update stream consumer, particularly while avoiding race conditions when
	// migrating from cmdb
	if (nodeType === 'System') {
		salesforceSync.setSalesforceIdForSystem(responseData);
	}

	logNodeChanges({
		newRecords: result.records,
		nodeType,
		removedRelationships,
	});

	return {
		data: responseData,
		status:
			method === 'PATCH' &&
			responseData._createdByRequest === parameters.requestId
				? 201
				: 200,
	};
};
