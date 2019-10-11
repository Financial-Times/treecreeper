const { getType } = require('../../../packages/schema-sdk');
const { convertNeo4jToJson } = require('./neo4j-type-conversion');
const { executeQuery } = require('../../api-core/lib/db-connection');

const invertDirection = direction =>
	direction === 'incoming' ? 'outgoing' : 'incoming';

const getDirection = (record, node) =>
	record.get('relationship').start === node.identity
		? 'outgoing'
		: 'incoming';

const bizOpsRecord = record => {
	const node = record.get('node');
	const hasRelationship = record.has('relationship');
	const ifRelationship = func => (hasRelationship ? func : () => null);

	return {
		get: (...args) => record.get(...args),
		has: (...args) => record.has(...args),
		relationship: ifRelationship(() => record.get('relationship').type),
		inverseDirection: ifRelationship(() =>
			invertDirection(getDirection(record, node)),
		),
		direction: ifRelationship(() => getDirection(record, node)),
		relatedType: ifRelationship(() => record.get('relatedLabels')[0]),
		relatedCode: ifRelationship(() => record.get('relatedCode')),
	};
};

const constructOutput = (nodeType, result, excludeMeta = false) => {
	if (!result.hasRecords()) {
		return;
	}
	const schema = getType(nodeType);
	const node = result.records[0].get('node');
	// TODO deep clone
	const response = convertNeo4jToJson(Object.assign({}, node.properties));
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
				([, { isRecursive, isRelationship }]) =>
					isRelationship && !isRecursive,
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
						.map(record => record.relatedCode());

					if (codes.length) {
						response[propName] = hasMany ? codes : codes[0];
					}
				},
			);
	}
	return response;
};

const addBizOpsEnhancements = result => {
	result.hasRecords = () => result.records && result.records.length;

	result.hasRelationships = () =>
		result.hasRecords() &&
		result.records[0].has('relatedCode') &&
		result.records[0].get('relatedCode');

	result.toJson = (type, excludeMeta) =>
		constructOutput(type, result, excludeMeta);

	result.getNode = () =>
		result.records &&
		result.records.length &&
		result.records[0].get('node');

	if (result.records) {
		result.records = result.records.map(bizOpsRecord);
	}
	return result;
};

module.exports.executeQuery = async (query, params) =>
	addBizOpsEnhancements(await executeQuery(query, params));
