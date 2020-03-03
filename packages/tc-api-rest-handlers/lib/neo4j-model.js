const { getType, invertDirection } = require('@financial-times/tc-schema-sdk');
const {
	executeQuery,
	executeQueriesWithTransaction,
} = require('@financial-times/tc-api-db-manager');
const { convertNeo4jToJson } = require('./neo4j-type-conversion');

const getDirection = (record, node) =>
	record.get('relationship').start === node.identity
		? 'outgoing'
		: 'incoming';

const treecreeperRecord = record => {
	const node = record.get('node');
	const hasRelationship = record.has('relationship');
	const ifRelationship = func => (hasRelationship ? func : () => null);

	return {
		get: (...args) => record.get(...args),
		has: (...args) => record.has(...args),
		richRelationship: ifRelationship(() => record.get('relationship')),
		relationship: ifRelationship(() => record.get('relationship').type),
		inverseDirection: ifRelationship(() =>
			invertDirection(getDirection(record, node)),
		),
		direction: ifRelationship(() => getDirection(record, node)),
		relatedType: ifRelationship(() => record.get('relatedLabels')[0]),
		relatedCode: ifRelationship(() => record.get('relatedCode')),
	};
};

const constructOutput = ({
	type: nodeType,
	result,
	excludeMeta = false,
	richRelationshipsFlag = false,
}) => {
	if (!result.hasRecords()) {
		return;
	}
	const schema = getType(nodeType);
	const node = result.records[0].get('node');
	// TODO deep clone
	const response = convertNeo4jToJson({ ...node.properties });
	if (excludeMeta) {
		Object.keys(response).forEach(key => {
			if (key.charAt(0) === '_') {
				delete response[key];
			}
		});
	}
	if (result.hasRelationships()) {
		Object.entries(schema.properties)
			.filter(
				([, { cypher, isRelationship }]) => isRelationship && !cypher,
			)
			.forEach(
				([
					propName,
					{ direction, relationship, type: propertyType, hasMany },
				]) => {
					const codes = result.records
						.filter(
							record =>
								direction === record.direction() &&
								relationship === record.relationship() &&
								propertyType === record.relatedType(),
						)
						.map(record => {
							const convertedRelationshipsProps = convertNeo4jToJson(
								{
									...record.richRelationship().properties,
								},
							);
							return richRelationshipsFlag
								? {
										...convertedRelationshipsProps,
										code: record.relatedCode(),
								  }
								: record.relatedCode();
						});

					if (codes.length) {
						response[propName] = hasMany ? codes : codes[0];
					}
				},
			);
	}
	return response;
};

const addTreecreeperEnhancements = result => {
	result.hasRecords = () => !!(result.records && result.records.length);

	result.hasRelationships = () =>
		!!(
			result.hasRecords() &&
			result.records[0].has('relatedCode') &&
			result.records[0].get('relatedCode')
		);

	result.toJson = ({ type, richRelationshipsFlag, excludeMeta }) =>
		constructOutput({
			type,
			result,
			excludeMeta,
			richRelationshipsFlag,
		});

	result.getNode = () =>
		result.records &&
		result.records.length &&
		result.records[0].get('node');

	if (result.records) {
		result.records = result.records.map(treecreeperRecord);
	}
	return result;
};

module.exports = {
	executeQuery: async (query, params) =>
		addTreecreeperEnhancements(await executeQuery(query, params)),
	executeQueriesWithTransaction: async (...queries) => {
		const results = await executeQueriesWithTransaction(...queries);
		return results.map(addTreecreeperEnhancements);
	},
};
