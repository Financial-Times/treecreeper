const { isSameNeo4jInteger } = require('./utils');

const constructNode = result => {
	const node = result.records[0].get('node');
	const response = {
		node: Object.assign({}, node.properties)
	};
	if (response.node.createdByRequest) {
		delete response.node.createdByRequest;
	}

	// check relationship key exists and is not null
	// if related is not defined it means we've done an optional match on relationships
	// and retrieved none
	if (result.records[0].has('related') && result.records[0].get('related')) {
		response.relationships = result.records.reduce((map, record) => {
			const target = record.get('related');
			const rel = record.get('relationship');
			map[rel.type] = map[rel.type] || [];

			map[rel.type].push({
				direction: isSameNeo4jInteger(rel.start, node.identity)
					? 'outgoing'
					: 'incoming',
				nodeType: target.labels[0],
				nodeCode: target.properties.code
			});
			return map;
		}, {});
	} else {
		response.relationships = {};
	}

	return response;
};

const constructRelationship = result => {
	return result.records[0].get('relationship').properties;
};

module.exports = {
	constructNode,
	constructRelationship
};
