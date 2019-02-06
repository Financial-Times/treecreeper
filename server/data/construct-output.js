const { isDateTime } = require('neo4j-driver/lib/v1/temporal-types.js');
const { getType } = require('@financial-times/biz-ops-schema');

const convertNeo4jTypes = obj => {
	Object.entries(obj).forEach(([key, val]) => {
		if (isDateTime(val)) {
			obj[key] = val.toString();
		}
	});
	return obj;
};

const constructOutput = (type, result) => {
	const schema = getType(type);
	const node = result.records[0].get('node');
	const response = convertNeo4jTypes(node.properties);

	if (result.records[0].get('relatedCode')) {
		const rawRelationships = result.records.map(record => {
			const relatedCode = record.get('relatedCode');
			const relatedLabels = record.get('relatedLabels');
			const rel = record.get('relationship');

			return {
				n4jRelationship: rel.type,
				n4jDirection:
					rel.start === node.identity ? 'outgoing' : 'incoming',
				n4jType: relatedLabels[0],
				n4jCode: relatedCode,
			};
		});
		Object.entries(schema.properties)
			.filter(
				([, { isRecursive, relationship }]) =>
					relationship && !isRecursive,
			)
			.forEach(
				([
					propName,
					{ direction, relationship, type: propertyType, hasMany },
				]) => {
					const codes = rawRelationships
						.filter(
							({ n4jRelationship, n4jDirection, n4jType }) =>
								direction === n4jDirection &&
								relationship === n4jRelationship &&
								propertyType === n4jType,
						)
						.map(({ n4jCode }) => n4jCode);

					if (codes.length) {
						response[propName] = hasMany ? codes : codes[0];
					}
				},
			);
	}
	return response;
};

module.exports = constructOutput;
module.exports.convertNeo4jTypes = convertNeo4jTypes;
