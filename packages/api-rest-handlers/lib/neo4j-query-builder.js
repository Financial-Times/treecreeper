const { stripIndents } = require('common-tags');
const {
	metaPropertiesForCreate,
	metaPropertiesForUpdate,
	prepareMetadataForNeo4jQuery,
} = require('./metadata-helpers');
const { constructNeo4jProperties } = require('./neo4j-type-conversion');
const {
	getRelationships,
	getAddedRelationships,
	getRemovedRelationships,
} = require('./relationships/input');
const {
	prepareToWriteRelationships,
	prepareRelationshipDeletion,
} = require('./relationships/write');
const { setLockedFields, mergeLockedFields } = require('./locked-fields');
const { getNeo4jRecordCypherQuery, getNeo4jRecord } = require('./read-helpers');
const { executeQuery } = require('./neo4j-model');
const { diffProperties } = require('./diff-properties');

const isObjectEqual = (base, compare) => {
	const baseKeys = Object.keys(base);
	const compareKeys = Object.keys(compare);
	if (baseKeys.length !== compareKeys.length) {
		return false;
	}

	const diff = baseKeys.filter(
		key => !(key in compare) || base[key] !== compare[key],
	);

	return diff.length === 0;
};

const getBaseQuery = (type, method) => {
	switch (method) {
		case 'CREATE':
			return stripIndents`
				CREATE (node:${type} $properties)
				SET ${metaPropertiesForCreate('node')}
				WITH node`;
		case 'MERGE':
			return stripIndents`MERGE (node:${type} { code: $code })
				SET ${metaPropertiesForUpdate('node')}
				SET node += $properties
				`;
		default:
			throw new Error('method must be either of CREATE OR MERGE');
	}
};

const queryBuilder = (method, input, body = {}) => {
	const { type, code, metadata = {}, query = {} } = input;
	const { relationshipAction, lockFields, unlockFields, upsert } = query;
	const { clientId } = metadata;

	// context is used for stacking data to update record
	const context = { upsert };

	const queryParts = [getBaseQuery(type, method)];
	let parameters = {
		code,
		...prepareMetadataForNeo4jQuery(metadata),
	};

	const builder = {};

	const updateParameter = updateObj => {
		parameters = { ...parameters, ...updateObj };
	};
	const updateProperties = props => {
		parameters.properties = {
			...parameters.properties,
			...props,
		};
	};

	const constructProperties = initialContent => {
		const bodyDiff = initialContent
			? diffProperties({ type, newContent: body, initialContent })
			: body;
		const properties = constructNeo4jProperties({
			type,
			code,
			body: { ...bodyDiff },
		});
		updateParameter({ properties });
		context.willModifyNode = bodyDiff && !!Object.keys(bodyDiff).length;
		return builder;
	};

	const createRelationships = () => {
		const relationships = getRelationships({ type, body });
		const {
			relationshipParameters,
			relationshipQueries,
		} = prepareToWriteRelationships(type, relationships, upsert, parameters);
		queryParts.push(...relationshipQueries);
		updateParameter(relationshipParameters);
		context.addedRelationships = relationships;
		return builder;
	};

	const removeRelationships = initialContent => {
		const removedRelationships = getRemovedRelationships({
			type,
			initialContent,
			newContent: body,
			action: relationshipAction,
		});
		if (Object.keys(removedRelationships).length) {
			const {
				parameters: deleteRelationshipParams,
				queryParts: deleteRelationshipQueries,
			} = prepareRelationshipDeletion(type, removedRelationships);
			queryParts.push(...deleteRelationshipQueries);
			updateParameter(deleteRelationshipParams);
		}
		context.willDeleteRelationships = !!Object.keys(removedRelationships)
			.length;
		context.removedRelationships = removedRelationships;
		return builder;
	};

	const addRelationships = initialContent => {
		const addedRelationships = getAddedRelationships({
			type,
			initialContent,
			newContent: body,
		});
		if (Object.keys(addedRelationships).length) {
			const {
				relationshipParameters: addRelationshipParams,
				relationshipQueries: addRelationshipQueries,
			} = prepareToWriteRelationships(type, addedRelationships, upsert);
			queryParts.push(...addRelationshipQueries);
			updateParameter(addRelationshipParams);
		}
		context.willAddRelationships = !!Object.keys(addedRelationships).length;
		context.addedRelationships = addedRelationships;
		return builder;
	};

	const mergeLockFields = initialContent => {
		const existingLockedFields =
			JSON.parse(initialContent._lockedFields || null) || {};
		const lockedFields = mergeLockedFields({
			body,
			clientId,
			lockFields,
			unlockFields,
			existingLockedFields,
			needValidate: true,
		});
		updateProperties({
			_lockedFields: Object.keys(lockedFields).length
				? JSON.stringify(lockedFields)
				: null,
		});
		context.willModifyLockedFields = !!(
			(unlockFields || lockFields) &&
			!isObjectEqual(lockedFields, existingLockedFields)
		);
		return builder;
	};

	const setLockFields = () => {
		const lockedFields = setLockedFields({
			clientId,
			lockFieldList: lockFields,
			body,
		});
		updateProperties({
			_lockedFields: Object.keys(lockedFields).length
				? JSON.stringify(lockedFields)
				: null,
		});
		return builder;
	};

	const execute = async () => {
		queryParts.push(getNeo4jRecordCypherQuery());
		const neo4jQuery = queryParts.join('\n');
		let neo4jResult = await executeQuery(neo4jQuery, parameters);
		// In _theory_ we could return the above all the time (it works most of the
		// time) but behaviour when deleting relationships is weird, and difficult
		// to obtain consistent results, so for safety we do a fresh get when
		// deletes are involved.
		if (context.willDeleteRelationships) {
			neo4jResult = await getNeo4jRecord(type, code);
		}
		return {
			neo4jResult,
			queryContext: context,
		};
	};

	const isNeo4jUpdateNeeded = () => {
		const {
			willModifyNode,
			willDeleteRelationships,
			willAddRelationships,
			willModifyLockedFields,
		} = context;
		const willModifyRelationships =
			willDeleteRelationships || willAddRelationships;

		return !!(
			willModifyNode ||
			willModifyRelationships ||
			willModifyLockedFields
		);
	};

	// Trick for lazy builder method assignment
	return Object.assign(builder, {
		constructProperties,
		createRelationships,
		removeRelationships,
		addRelationships,
		mergeLockFields,
		setLockFields,
		isNeo4jUpdateNeeded,
		execute,
	});
};

module.exports = {
	queryBuilder,
};
