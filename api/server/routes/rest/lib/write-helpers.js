const { stripIndents } = require('common-tags');
const httpError = require('http-errors');
const { getType } = require('../../../../../packages/schema-sdk');
const _isEmpty = require('lodash.isempty');
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
	bodyDocuments,
	willUpdateNeo4j,
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

	// Prefer simplicity/readability over optimisation here -
	// S3 and neo4j writes are in series instead of parallel
	// so we don't have to bother thinking about rolling back actions for
	// all the different possible combinations of successes/failures
	// in different orders. S3 requests are more reliable than neo4j
	// requests so try s3 first, and roll back S3 if neo4j write fails.
	let neo4jWriteResult;
	let versionId;
	let newBodyDocs;
	if (!_isEmpty(bodyDocuments)) {
		({ versionId, newBodyDocs } = await s3DocumentsHelper.sendDocumentsToS3(
			method,
			nodeType,
			code,
			bodyDocuments,
		));
	} else {
		logger.info(
			{ event: 'SKIP_S3_UPDATE' },
			'No changed Document properties - skipping update',
		);
	}
	try {
		if (!willUpdateNeo4j) {
			logger.info(
				{ event: 'SKIP_NEO4J_UPDATE' },
				'No changed properties, relationships or field locks - skipping update',
			);
		} else {
			neo4jWriteResult = await executeQuery(
				queryParts.join('\n'),
				parameters,
				true,
			);
			logger.info(
				{ event: `${method}_NEO4J_SUCCESS` },
				neo4jWriteResult,
				`${method}: neo4j write successful`,
			);
		}
	} catch (err) {
		if (!_isEmpty(bodyDocuments) && versionId) {
			logger.info(
				{ event: `${method}_NEO4J_FAILURE` },
				err,
				`${method}: neo4j write unsuccessful, attempting to rollback S3 write`,
			);
			s3DocumentsHelper.deleteFileFromS3(nodeType, code, versionId);
		}
		throw new Error(err);
	}

	// In _theory_ we could return the above all the time (it works most of the time)
	// but behaviour when deleting relationships is confusing, and difficult to
	// obtain consistent results, so for safety do a fresh get when deletes are involved.
	//
	// Also, if we didn't update the database already we need to do a get to obtain the
	// record at all
	if (willDeleteRelationships || !willUpdateNeo4j) {
		neo4jWriteResult = await getNodeWithRelationships(nodeType, code);
	}
	const responseData = neo4jWriteResult.toApiV2(nodeType);

	Object.assign(responseData, newBodyDocs);

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
				...Object.keys(bodyDocuments),
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
	const nodeProperties = getType(nodeType).properties;
	const bodyDocuments = {};
	const bodyNoDocs = {};
	Object.keys(body).forEach(prop => {
		if (nodeProperties[prop].type === 'Document') {
			bodyDocuments[prop] = body[prop];
		} else {
			bodyNoDocs[prop] = body[prop];
		}
	});
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
		bodyDocuments,
		willUpdateNeo4j: true,
		method,
		upsert,
		isCreate: true,
		propertiesToModify: constructNeo4jProperties({
			nodeType,
			newContent: bodyNoDocs,
			code,
		}),
		lockedFields,
		relationshipsToCreate: getAddedRelationships({
			nodeType,
			newContent: bodyNoDocs,
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
