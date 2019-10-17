const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
const _isEmpty = require('lodash.isempty');
const { executeQuery } = require('./lib/neo4j-model');
const { validateInput } = require('./lib/validation');
const { getNeo4jRecord } = require('./lib/read-helpers');
const { constructNeo4jProperties } = require('./lib/neo4j-type-conversion');
const {
	getAddedRelationships,
	getRemovedRelationships,
	containsRelationshipData,
} = require('./lib/relationships/input');
const { postHandler } = require('./post');
const {
	prepareToWriteRelationships,
	prepareRelationshipDeletion,
	handleUpsertError,
} = require('./lib/relationships/write');
const { diffProperties } = require('./lib/diff-properties');
const { getNeo4jRecordCypherQuery } = require('./lib/read-helpers');
const {
	metaPropertiesForUpdate,
	prepareMetadataForNeo4jQuery,
} = require('./lib/metadata-helpers');
const { separateDocsFromBody } = require('./lib/separate-documents-from-body');

const toArray = val => (Array.isArray(val) ? val : [val]);

const validateRelationshipInputs = ({
	type,
	body,
	query: { relationshipAction } = {},
}) => {
	if (containsRelationshipData(type, body)) {
		if (
			!relationshipAction ||
			!['merge', 'replace'].includes(relationshipAction)
		) {
			throw httpErrors(
				400,
				'PATCHing relationships requires a relationshipAction query param set to `merge` or `replace`',
			);
		}
		Object.entries(body)
			.filter(([propName]) => propName.startsWith('!'))
			.forEach(([propName, deletedCodes]) => {
				const addedCodes = toArray(body[propName.substr(1)]);
				deletedCodes = toArray(deletedCodes);
				if (deletedCodes.some(code => addedCodes.includes(code))) {
					throw httpErrors(
						400,
						'Trying to add and remove a relationship to a record at the same time',
					);
				}
			});
	}
};

const patchHandler = ({
	documentStore = { patch: () => ({}), delete: () => null },
} = {}) => {
	const post = postHandler({ documentStore });

	return async input => {
		const { type, code, body, metadata = {}, query = {} } = validateInput(
			input,
		);

		validateRelationshipInputs(input);

		const preflightRequest = await getNeo4jRecord(type, code);
		if (!preflightRequest.hasRecords()) {
			return Object.assign(await post(input), { status: 201 });
		}

		const initialContent = preflightRequest.toJson(type);

		let versionMarker;
		let newBodyDocs;
		const { bodyDocuments, bodyNoDocs } = separateDocsFromBody(type, body);

		if (!_isEmpty(bodyDocuments)) {
			({ versionMarker, body: newBodyDocs } = await documentStore.patch(
				type,
				code,
				bodyDocuments,
			));
		}

		const properties = constructNeo4jProperties({
			type,
			code,
			body: diffProperties({
				type,
				newContent: bodyNoDocs,
				initialContent,
			}),
		});

		const removedRelationships = getRemovedRelationships({
			type,
			initialContent,
			newContent: bodyNoDocs,
			action: query.relationshipAction,
		});

		const addedRelationships = getAddedRelationships({
			type,
			initialContent,
			newContent: bodyNoDocs,
		});

		const willModifyNode = !!Object.keys(properties).length;

		const willDeleteRelationships = !!Object.keys(removedRelationships)
			.length;
		const willCreateRelationships = !!Object.keys(addedRelationships)
			.length;
		const willModifyRelationships =
			willDeleteRelationships || willCreateRelationships;

		const willUpdateNeo4j = !!(willModifyNode || willModifyRelationships);

		if (!willUpdateNeo4j) {
			return { status: 200, body: initialContent };
		}

		const queryParts = [
			stripIndents`MERGE (node:${type} { code: $code })
					SET ${metaPropertiesForUpdate('node')}
					SET node += $properties
				`,
		];

		const parameters = Object.assign(
			{
				code,
				properties,
			},
			prepareMetadataForNeo4jQuery(metadata),
		);

		if (willDeleteRelationships) {
			const {
				parameters: delParams,
				queryParts: relDeleteQueries,
			} = prepareRelationshipDeletion(type, removedRelationships);

			queryParts.push(...relDeleteQueries);
			Object.assign(parameters, delParams);
		}
		if (willCreateRelationships) {
			const {
				relationshipParameters,
				relationshipQueries,
			} = prepareToWriteRelationships(
				type,
				addedRelationships,
				query.upsert,
			);
			Object.assign(parameters, relationshipParameters);
			queryParts.push(...relationshipQueries);
		}

		queryParts.push(getNeo4jRecordCypherQuery());
		try {
			const neo4jResult = await executeQuery(
				queryParts.join('\n'),
				parameters,
			);
			const responseData = Object.assign(
				neo4jResult.toJson(type),
				newBodyDocs,
			);

			return { status: 200, body: responseData };
		} catch (err) {
			if (!_isEmpty(bodyDocuments) && versionMarker) {
				documentStore.delete(type, code, versionMarker);
			}
			handleUpsertError(err);
			throw err;
		}
	};
};

module.exports = { patchHandler };
