const _isEmpty = require('lodash.isempty');
const { stripIndents } = require('common-tags');
const { executeQuery } = require('./neo4j-model');
const { constructNeo4jProperties } = require('./neo4j-type-conversion');
const {
	metaPropertiesForCreate,
	metaPropertiesForUpdate,
	prepareMetadataForNeo4jQuery,
} = require('./metadata-helpers');
const {
	getWriteRelationships,
	getChangedRelationships,
	getRemovedRelationships,
	identifyRelationships,
} = require('./relationships/input');
const {
	prepareToWriteRelationships,
	prepareRelationshipDeletion,
} = require('./relationships/write');
const { setLockedFields, mergeLockedFields } = require('./locked-fields');
const { getNeo4jRecordCypherQuery } = require('./read-helpers');
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

const getBaseQuery = (type, method, willUpdateMeta) => {
	switch (method) {
		case 'CREATE':
			return stripIndents`
				CREATE (node:${type} $properties)
				SET ${metaPropertiesForCreate('node')}
				WITH DISTINCT node`;
		case 'MERGE':
			return stripIndents`
				MERGE (node:${type} { code: $code })
				${willUpdateMeta ? `SET ${metaPropertiesForUpdate('node')}` : ''}
				SET node += $properties`;
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

	const queryParts = [];
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
		// we need the diff even if no initial content as it gets rid of
		// relationship properties
		const bodyDiff = diffProperties({
			type,
			newContent: body,
			initialContent,
		});
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
		const relationships = getWriteRelationships({ type, body });
		const {
			relationshipParameters,
			relationshipQueries,
		} = prepareToWriteRelationships(type, relationships, upsert);
		queryParts.push(...relationshipQueries);
		updateParameter(relationshipParameters);
		context.changedRelationships = relationships;
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

	const changeRelationships = initialContent => {
		const changedRelationships = getChangedRelationships({
			type,
			initialContent,
			newContent: body,
		});
		if (Object.keys(changedRelationships).length) {
			const {
				relationshipParameters: changeRelationshipParams,
				relationshipQueries: changeRelationshipQueries,
			} = prepareToWriteRelationships(type, changedRelationships, upsert);
			queryParts.push(...changeRelationshipQueries);
			updateParameter(changeRelationshipParams);
		}
		const isRelationship = identifyRelationships(type);
		const initialContentRels = Object.keys(
			initialContent,
		).filter(propName => isRelationship(propName));

		// context.willChangeRelationships indicates these changes are included
		// - creating new relationships
		// - updating relationship props (additons and deletions)
		context.willChangeRelationships = !!Object.keys(changedRelationships)
			.length;
		context.willCreateRelationships = !_isEmpty(
			Object.keys(changedRelationships).filter(
				changedRelationship =>
					!initialContentRels.includes(changedRelationship),
			),
		);
		context.changedRelationships = changedRelationships;

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
		const willUpdateMeta =
			context.willModifyNode ||
			context.willCreateRelationships ||
			context.willDeleteRelationships;
		queryParts.unshift(getBaseQuery(type, method, willUpdateMeta));
		queryParts.push(getNeo4jRecordCypherQuery());
		const neo4jQuery = queryParts.join('\n');
		const neo4jResult = await executeQuery(neo4jQuery, parameters);

		return {
			neo4jResult,
			queryContext: context,
			parameters,
		};
	};

	const isNeo4jUpdateNeeded = () => {
		const {
			willModifyNode,
			willDeleteRelationships,
			willChangeRelationships,
			willModifyLockedFields,
		} = context;
		const willModifyRelationships =
			willDeleteRelationships || willChangeRelationships;

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
		changeRelationships,
		mergeLockFields,
		setLockFields,
		isNeo4jUpdateNeeded,
		execute,
	});
};

module.exports = {
	queryBuilder,
};
