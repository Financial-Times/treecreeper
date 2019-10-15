const httpErrors = require('http-errors');
const { stripIndents } = require('common-tags');
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

const patchHandler = () => {
	const post = postHandler();

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

		const properties = constructNeo4jProperties({
			type,
			code,
			body: diffProperties({
				type,
				newContent: body,
				initialContent,
			}),
		});

		const removedRelationships = getRemovedRelationships({
			type,
			initialContent,
			newContent: body,
			action: query.relationshipAction,
		});

		const addedRelationships = getAddedRelationships({
			type,
			initialContent,
			newContent: body,
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
			return { status: 200, body: neo4jResult.toJson(type) };
		} catch (err) {
			handleUpsertError(err);
			throw err;
		}
	};
};

module.exports = { patchHandler };
