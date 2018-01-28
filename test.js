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

const redundant = [];

for (let key in intermediateHash) {
	if (intermediateHash.hasOwnProperty(key)) {
		const node = intermediateHash[key];
		const rships = node.relationships;

		for (let rshipKey in rships) {
			if (rships.hasOwnProperty(rshipKey)) {

				const rshipsOfType = rships[rshipKey];

				for (let nodeKey in rshipsOfType) {
					if (rshipsOfType.hasOwnProperty(nodeKey)) {
						const endNode = rshipsOfType[nodeKey];
						// console.log('\n\nLOOKING FOR ', endNode)

						// this child node has further children
						if (intermediateHash[endNode.id]) {
							endNode.relationships = intermediateHash[endNode.id].relationships;
							console.log('MOVED INSIDE PARENT, NEED TO DELETE FROM ROOT', endNode.id);
							redundant.push(endNode.id);
						}
					}
				}
			}
		}
	}
}

for (let id of redundant) {
	console.log('DELETING FROM ROOT', id);
	delete intermediateHash[id];
}

console.log(JSON.stringify(intermediateHash, null, 2));


