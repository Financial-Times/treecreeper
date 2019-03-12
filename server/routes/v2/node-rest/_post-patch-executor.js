const { stripIndents } = require('common-tags');
const { getType } = require('@financial-times/biz-ops-schema');
const { logNodeChanges } = require('../../../lib/log-to-kinesis');
const { executeQuery } = require('../../../data/db-connection');
const cypherHelpers = require('../../../data/cypher-helpers');
const salesforceSync = require('../../../lib/salesforce-sync');
const { getDbWriteContext } = require('../../../lib/request-context');

const prepareToWriteRelationships = (
	nodeType,
	relationshipsToCreate,
	upsert,
) => {
	const { properties: validProperties } = getType(nodeType);

	const relationshipParameters = {};
	const relationshipQueries = [];

	Object.entries(relationshipsToCreate).forEach(([propName, codes]) => {
		const propDef = validProperties[propName];

		const key = `${propDef.relationship}${propDef.direction}${
			propDef.type
		}`;

		// make sure the parameter referenced in the query exists on the
		// globalParameters object passed to the db driver
		Object.assign(relationshipParameters, { [key]: codes });

		const defWithKey = Object.assign({ key }, propDef);

		// Note on the limitations of cypher:
		// It would be so nice to use UNWIND to create all these from a list parameter,
		// but unfortunately parameters cannot be used to specify relationship labels
		relationshipQueries.push(
			stripIndents`
			WITH node
			${
				upsert
					? cypherHelpers.mergeNode(defWithKey)
					: cypherHelpers.optionalMatchNode(defWithKey)
			}
			WITH node, related
			${cypherHelpers.mergeRelationship(defWithKey)}
		`,
		);
	});

	return { relationshipParameters, relationshipQueries };
};

module.exports = async ({
	nodeType,
	code,
	method,
	upsert,
	isCreate,

	propertiesToModify,
	lockedFields,
	relationshipsToCreate,
	removedRelationships,
	parameters = {},
	queryParts,

	willDeleteRelationships,
}) => {
	const {
		relationshipParameters,
		relationshipQueries,
	} = prepareToWriteRelationships(nodeType, relationshipsToCreate, upsert);

	Object.assign(
		parameters,
		getDbWriteContext(),
		{
			code,
			properties: propertiesToModify,
			lockedFields,
		},
		relationshipParameters,
	);

	queryParts.push(...relationshipQueries, cypherHelpers.nodeWithRels());

	let result = await executeQuery(queryParts.join('\n'), parameters, true);
	// In _theory_ we could return the above all the time (it works most of the time)
	// but behaviour when deleting relationships is confusing, and difficult to
	// obtain consistent results, so for safety do a fresh get when deletes are involved
	if (willDeleteRelationships) {
		result = await cypherHelpers.getNodeWithRelationships(nodeType, code);
	}
	const responseData = result.toApiV2(nodeType);

	// HACK: While salesforce also exists as a rival source of truth for Systems,
	// we sync with it here. Don't like it being in here as the api should be agnostic
	// in how it handles types, but a little hack in here feels preferable to managing
	// another update stream consumer, particularly while avoiding race conditions when
	// migrating from cmdb
	if (nodeType === 'System') {
		salesforceSync.setSalesforceIdForSystem(responseData);
	}

	logNodeChanges({
		result,
		removedRelationships,
		updatedProperties: [
			...new Set([
				...Object.keys(propertiesToModify),
				...Object.keys(removedRelationships || {}),
				...Object.keys(relationshipsToCreate || {}),
			]),
		],
		addedRelationships: relationshipsToCreate,
	});

	return {
		data: responseData,
		status: method === 'PATCH' && isCreate ? 201 : 200,
	};
};
