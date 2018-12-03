const Integer = require('neo4j-driver/lib/v1/integer.js');
const { getType } = require('@financial-times/biz-ops-schema');

const convertIntegersToNumbers = obj => {
	for (const key in obj) {
		if (Integer.isInt(obj[key])) {
			obj[key] = obj[key].toNumber();
		}
	}
	return obj;
};

const constructNode = (type, result) => {
	const schema = getType(type);
	const node = result.records[0].get('node');
	const response = convertIntegersToNumbers(node.properties);

	if (result.records[0].get('related')) {
		const rawRelationships = result.records.map(record => {
			const target = record.get('related');
			const rel = record.get('relationship');

			return {
				n4jRelationship: rel.type,
				n4jDirection: rel.start.equals(node.identity) ? 'outgoing' : 'incoming',
				n4jType: target.labels[0],
				n4jCode: target.properties.code
			};
		});
		Object.entries(schema.properties)
			.filter(
				([, { isRecursive, relationship }]) => relationship && !isRecursive
			)
			.forEach(([propName, { direction, relationship, type, hasMany }]) => {
				const codes = rawRelationships
					.filter(
						({ n4jRelationship, n4jDirection, n4jType }) =>
							direction === n4jDirection &&
							relationship === n4jRelationship &&
							type === n4jType
					)
					.map(({ n4jCode }) => n4jCode);

				if (codes.length) {
					response[propName] = hasMany ? codes : codes[0];
				}
			});
	}
	return response;
};

module.exports = {
	constructNode
};
