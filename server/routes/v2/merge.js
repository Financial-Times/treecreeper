const httpErrors = require('http-errors');
const { validateTypeName } = require('../../lib/schema-validation');
const { executeQuery } = require('../../data/db-connection');
const constructOutput = require('../../data/construct-output');
const { setContext } = require('../../lib/request-context');
const { logMergeChanges } = require('../../lib/log-to-kinesis');
const { RETURN_NODE_WITH_RELS } = require('../../data/cypher-helpers');

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
	setContext(input.body);
	const {
		clientId,
		clientUserId,
		requestId,
		body: { type, sourceCode, destinationCode },
	} = input;

	// As the actual merge is carried out by some apoc procedure magic, we
	// first query the DB to learn what the initial state is so we can log
	// what's changed to kinesis after the update is done
	const [
		sourceNode,
		destinationNode,
		sourceRels,
		destinationRels,
	] = await Promise.all([
		executeQuery(
			`MATCH (node:${type} { code: $sourceCode })
			RETURN node`,
			{ sourceCode },
		),
		executeQuery(
			`MATCH (node:${type} { code: $destinationCode })
			RETURN node`,
			{ destinationCode },
		),
		executeQuery(
			`MATCH (node:${type} { code: $sourceCode })-[relationship]-(related)
			RETURN node, relationship, related`,
			{ sourceCode },
		),
		executeQuery(
			`MATCH (node:${type} { code: $destinationCode })-[relationship]-(related)
			RETURN node, relationship, related`,
			{ destinationCode },
		),
	]);

	if (!sourceNode.records.length) {
		throw httpErrors(404, `${type} record missing for \`${sourceCode}\``);
	}

	if (!destinationNode.records.length) {
		throw httpErrors(
			404,
			`${type} record missing for \`${destinationCode}\``,
		);
	}

	const result = await executeQuery(
		`
	OPTIONAL MATCH (s:${type} { code: $sourceCode }), (d:${type} { code: $destinationCode })
	CALL apoc.refactor.mergeNodes([d, s], {properties:"discard", mergeRels:true})
	YIELD node
	MATCH (node)-[relationship]-(related)
	RETURN node, relationship, related
	`,
		{ sourceCode, destinationCode },
	);

	const { deletions: deletedRelationships } = result.records.reduce(
		({ relDirs, deletions }, record) => {
			const relName = record.get('relationship').type;
			const direction = record
				.get('relationship')
				.start.equals(record.get('node').identity)
				? 'outgoing'
				: 'incoming';
			const destination = `${record.get('related').labels[0]}:${
				record.get('related').properties.code
			}`;

			// TODO once upgraded to neo4j 3.4 and corresponding apoc upgrade, deduping
			// rels won't be required
			if (relDirs[`${direction}:${relName}:${destination}`]) {
				deletions.push(record.get('relationship').identity.toInt());
			} else {
				relDirs[`${direction}:${relName}:${destination}`] = true;
				if (
					record
						.get('relationship')
						.start.equals(record.get('relationship').end)
				) {
					// we currently have no use cases for relationships beginning and ending
					// at the same node, so we can safely assume any that exist after the refactor
					// can be removed
					deletions.push(record.get('relationship').identity.toInt());
				}
			}
			return { relDirs, deletions };
		},
		{ relDirs: {}, deletions: [] },
	);

	if (deletedRelationships.length) {
		await executeQuery(
			`MATCH ()-[r]-()
			WHERE id(r) IN [${deletedRelationships.join(',')}]
			DELETE r`,
		);
	}

	logMergeChanges(
		requestId,
		clientId,
		clientUserId,
		sourceNode,
		destinationNode,
		sourceRels,
		destinationRels,
	);

	return executeQuery(
		`MATCH (node:${type} {code: $destinationCode})
		${RETURN_NODE_WITH_RELS}`,
		{ destinationCode },
	).then(constructOutput.bind(null, type));
};
