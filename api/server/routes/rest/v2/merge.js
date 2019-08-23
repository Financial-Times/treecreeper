const httpErrors = require('http-errors');
const { getType } = require('../../../../../packages/schema-sdk');
const { validateTypeName } = require('../lib/validation');
const { executeQuery } = require('../lib/neo4j-model');
const { setContext } = require('../../../lib/request-context');
const {
	logNodeChanges,
	logNodeDeletion,
} = require('../../../lib/log-to-kinesis');
const {
	diffProperties,
	getRemovedRelationships,
	getAddedRelationships,
} = require('../lib/diff-helpers');
const { nodeWithRelsCypher } = require('../lib/read-helpers');
const {
	prepareRelationshipDeletion,
} = require('../lib/relationship-write-helpers');

const validate = ({ body: { type, sourceCode, destinationCode } }) => {
	if (!type) {
		throw httpErrors(400, 'No type parameter provided');
	}
	if (!sourceCode) {
		throw httpErrors(400, 'No sourceCode parameter provided');
	}
	if (!destinationCode) {
		throw httpErrors(400, 'No destinationCode parameter provided');
	}

	validateTypeName(type);
};

module.exports = async input => {
	validate(input);
	const {
		body: { type: nodeType, sourceCode, destinationCode },
	} = input;

	setContext({ nodeType, sourceCode, destinationCode });

	// Fetch the nodes to be updated
	const [sourceNode, destinationNode] = await Promise.all([
		executeQuery(
			`MATCH (node:${nodeType} { code: $sourceCode })
			${nodeWithRelsCypher()}`,
			{ sourceCode },
			true,
		),
		executeQuery(
			`MATCH (node:${nodeType} { code: $destinationCode })
			${nodeWithRelsCypher()}`,
			{ destinationCode },
			true,
		),
	]);

	if (!sourceNode.records.length) {
		throw httpErrors(
			404,
			`${nodeType} record missing for \`${sourceCode}\``,
		);
	}

	if (!destinationNode.records.length) {
		throw httpErrors(
			404,
			`${nodeType} record missing for \`${destinationCode}\``,
		);
	}

	const sourceRecord = sourceNode.toApiV2(nodeType, true);
	const destinationRecord = destinationNode.toApiV2(nodeType, true);

	const writeProperties = diffProperties({
		nodeType,
		newContent: sourceRecord,
		initialContent: destinationRecord,
	});

	Object.keys(sourceRecord).forEach(name => {
		if (name in destinationRecord) {
			delete writeProperties[name];
		}
	});

	const removedRelationships = getRemovedRelationships({
		nodeType,
		initialContent: sourceRecord,
		newContent: destinationRecord,
		action: 'merge',
	});
	const { properties } = getType(nodeType);

	const possibleReflections = Object.entries(properties)
		.filter(([, { type: otherType }]) => nodeType === otherType)
		.map(([name]) => name);

	possibleReflections.forEach(propName => {
		if (
			sourceRecord[propName] &&
			sourceRecord[propName].includes(destinationCode)
		) {
			if (removedRelationships[propName]) {
				removedRelationships[propName].push(destinationCode);
			} else {
				removedRelationships[propName] = [destinationCode];
			}
		}
	});
	const willDeleteRelationships = !!Object.keys(removedRelationships).length;
	if (willDeleteRelationships) {
		const queryParts = [`MATCH (node:${nodeType} { code: $code })`];

		const {
			parameters,
			queryParts: relDeleteQueries,
		} = prepareRelationshipDeletion(nodeType, removedRelationships);

		queryParts.push(...relDeleteQueries, 'RETURN node');
		await executeQuery(
			queryParts.join('\n'),
			Object.assign(parameters, { code: sourceCode }),
		);
		logNodeChanges({
			result: sourceNode,
			removedRelationships,
		});
	}

	const result = await executeQuery(
		`OPTIONAL MATCH (sourceNode:${nodeType} { code: $sourceCode }), (destinationNode:${nodeType} { code: $destinationCode })
	CALL apoc.refactor.mergeNodes([destinationNode, sourceNode], {properties:"discard", mergeRels:true})
	YIELD node
	${nodeWithRelsCypher({ includeWithStatement: false })}
	`,
		{ sourceCode, destinationCode },
		true,
	);

	const finalState = result.toApiV2(nodeType);

	const addedRelationships = getAddedRelationships({
		nodeType,
		initialContent: destinationRecord,
		newContent: result.toApiV2(nodeType, true),
	});

	logNodeDeletion(sourceNode.getNode());
	logNodeChanges({
		result,
		updatedProperties: [
			...new Set([
				...Object.keys(writeProperties),
				...Object.keys(addedRelationships || {}),
			]),
		],
		addedRelationships,
	});

	return finalState;
};
