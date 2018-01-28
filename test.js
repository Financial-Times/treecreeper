const records = require('./test.json');

const result = { records };

const intermediateHash = {};

const includesObj = (array, obj) => {


	for (const item of array) {

		if (item && item.id === obj.id) {
			return true;
		}
	}
	return false;
};

if (result.records.length) {

	for (const record of result.records) {

		for (const field of record._fields) {

			for (const segment of field.segments) {

				const start = segment.start.properties;

				if (!intermediateHash[start.id]) {
					intermediateHash[start.id] = {
						properties: {},
						relationships: {}
					};
				}

				intermediateHash[start.id].properties = start;

				const end = segment.end.properties;
				end.label = segment.end.labels[0];

				if (!intermediateHash[start.id].relationships[segment.relationship.type]) {
					intermediateHash[start.id].relationships[segment.relationship.type] = [];
				}

				if (!includesObj(intermediateHash[start.id].relationships[segment.relationship.type], end)) {
					intermediateHash[start.id].relationships[segment.relationship.type].push(end);
				}
			}
		}
	}
}

console.log(JSON.stringify(intermediateHash, null, 2));




