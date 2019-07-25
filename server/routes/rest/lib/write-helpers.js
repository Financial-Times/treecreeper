const { stripIndents } = require('common-tags');
const httpError = require('http-errors');
const { getType } = require('@financial-times/biz-ops-schema');
const { executeQuery } = require('./neo4j-model');
const { getAddedRelationships } = require('./diff-helpers');
const { constructNeo4jProperties } = require('./neo4j-type-conversion');
const {
	metaPropertiesForCreate,
	getDbWriteContext,
} = require('./metadata-helpers');
const {
	nodeWithRelsCypher,
	getNodeWithRelationships,
} = require('./read-helpers');
const { logNodeChanges } = require('../../../lib/log-to-kinesis');
const { prepareToWriteRelationships } = require('./relationship-write-helpers');
const { mergeLockedFields } = require('./locked-fields');
const salesforceSync = require('../../../lib/salesforce-sync');
const S3DocumentsHelper = require('../../rest/lib/s3-documents-helper');

const s3DocumentsHelper = new S3DocumentsHelper();
const { logger } = require('../../../lib/request-context');

let setSalesforceIdForSystem;

const writeNode = async ({
	nodeType,
	code,
	body,
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

	queryParts.push(...relationshipQueries, nodeWithRelsCypher());

	// Prefer simplicity/readabilitiy over optimisation here -
	// S3 and neo4j writes are in series instead of parallel
	// so we don't have to bother thinking about rolling back actions for
	// all the different possible combinations of successes/failures
	// in different orders. S3 requests are more reliable than neo4j
	// requests so try s3 first, and roll back S3 if neo4j write fails.
	let neo4jWriteResult;
	await s3DocumentsHelper.sendDocumentsToS3(method, nodeType, code, body);
	try {
		neo4jWriteResult = await executeQuery(
			queryParts.join('\n'),
			parameters,
			true,
		);
	} catch (err) {
		logger.info(
			err,
			`${method}: neo4j write unsuccessful, attempting to rollback S3 write`,
		);
		s3DocumentsHelper.deleteFileFromS3(nodeType, code);
		throw new Error(err);
	}

	// In _theory_ we could return the above all the time (it works most of the time)
	// but behaviour when deleting relationships is confusing, and difficult to
	// obtain consistent results, so for safety do a fresh get when deletes are involved
	if (willDeleteRelationships) {
		neo4jWriteResult = await getNodeWithRelationships(nodeType, code);
	}
	const responseData = neo4jWriteResult.toApiV2(nodeType);

	// HACK: While salesforce also exists as a rival source of truth for Systems,
	// we sync with it here. Don't like it being in here as the api should be agnostic
	// in how it handles types, but a little hack in here feels preferable to managing
	// another update stream consumer, particularly while avoiding race conditions when
	// migrating from cmdb
	if (nodeType === 'System') {
		setSalesforceIdForSystem(responseData);
	}

	logNodeChanges({
		result: neo4jWriteResult,
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

const createNewNode = ({ nodeType, code, clientId, query, body, method }) => {
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
		Object.assign({ clientId, body }, query),
	);

	return writeNode({
		nodeType,
		code,
		body,
		method,
		upsert,
		isCreate: true,
		propertiesToModify: constructNeo4jProperties({
			nodeType,
			newContent: body,
			code,
		}),
		lockedFields,
		relationshipsToCreate: getAddedRelationships({
			nodeType,
			newContent: body,
		}),
		queryParts: [
			stripIndents`
			CREATE (node:${nodeType} $properties)
				SET ${metaPropertiesForCreate('node')}
			WITH node`,
		],
	});
};

// For new Systems, we set salesforceId asynchronously after returning the response
// The simplest way to do so is to use the patch handler (ie the function)
// that handles PATCH requests to the api) to patch the record once we have
// an ID back from salesforce.
// This leads to circular dependencies unless we use something like the below
// to inject the patchHandler into here
// Might be worth refactoring to be more event based and decoupled, but once
// we get rid of remedyforce it can all be deleted anyway, so perhaps worth
// just putting up with the ugliness for now
const initSalesforceSync = patchHandler => {
	setSalesforceIdForSystem = input =>
		salesforceSync.setSalesforceIdForSystem(input, patchHandler);
};

module.exports = {
	writeNode,
	createNewNode,
	initSalesforceSync,
};
