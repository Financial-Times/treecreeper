const { stripIndents } = require('common-tags');
const httpError = require('http-errors');
const { getType } = require('@financial-times/biz-ops-schema');
const { executeQuery } = require('../../data/db-connection');
const cypherHelpers = require('../../data/cypher-helpers');
const recordAnalysis = require('../../data/record-analysis');
const { constructNeo4jProperties } = require('../../data/data-conversion');

const { logNodeChanges } = require('../../lib/log-to-kinesis');
const salesforceSync = require('../../lib/salesforce-sync');
const { getDbWriteContext } = require('../../lib/request-context');
const { mergeLockedFields } = require('../../lib/locked-fields');

let setSalesforceIdForSystem;

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

const writeNode = async ({
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
		setSalesforceIdForSystem(responseData);
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

const createNewNode = (nodeType, code, clientId, query, body, method) => {
	const { upsert } = query;

	const { createPermissions, pluralName } = getType(nodeType);
	if (createPermissions && !createPermissions.includes(clientId)) {
		throw httpError(
			400,
			`${pluralName} can only be created by ${createPermissions.join(
				', ',
			)}`,
		);
	}

	const lockedFields = mergeLockedFields(
		Object.assign({ nodeType, clientId }, query),
	);

	return writeNode({
		nodeType,
		code,
		method,
		upsert,
		isCreate: true,

		propertiesToModify: constructNeo4jProperties({
			nodeType,
			newContent: body,
			code,
		}),
		lockedFields,
		relationshipsToCreate: recordAnalysis.getAddedRelationships({
			nodeType,
			newContent: body,
		}),
		queryParts: [
			stripIndents`CREATE (node:${nodeType} $properties)
				SET ${cypherHelpers.metaPropertiesForCreate('node')}
			WITH node`,
		],
	});
};

const prepareRelationshipDeletion = (nodeType, removedRelationships) => {
	const parameters = {};
	const queryParts = [];

	const schema = getType(nodeType);
	queryParts.push(
		...Object.entries(removedRelationships).map(([propName, codes]) => {
			const def = schema.properties[propName];
			const key = `Delete${def.relationship}${def.direction}${def.type}`;
			parameters[key] = codes;
			return `WITH node
				${cypherHelpers.deleteRelationships(def, key)}
				`;
		}),
	);

	return { parameters, queryParts };
};

const initSalesforceSync = patchHandler => {
	setSalesforceIdForSystem = input =>
		salesforceSync.setSalesforceIdForSystem(input, patchHandler);
};

module.exports = {
	writeNode,
	createNewNode,
	prepareRelationshipDeletion,
	initSalesforceSync,
};
