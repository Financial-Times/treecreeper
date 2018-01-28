const includesObj = (array, obj) => {
	for (const item of array) {
		if (item && item.id === obj.id) {
			return true;
		}
	}
	return false;
};

module.exports = (result) => {

	const hash = {};

	// Build a hash where the key is the id of every node that is a parent
	if (result.records.length) {
		for (const record of result.records) {
			for (const field of record._fields) {
				for (const segment of field.segments) {
					const start = segment.start.properties;

					if (!hash[start.id]) {
						hash[start.id] = {
							properties: {},
							relationships: {}
						};
					}

					hash[start.id].properties = start;

					const end = segment.end.properties;
					end.label = segment.end.labels[0];

					if (!hash[start.id].relationships[segment.relationship.type]) {
						hash[start.id].relationships[segment.relationship.type] = [];
					}

					if (!includesObj(hash[start.id].relationships[segment.relationship.type], end)) {
						hash[start.id].relationships[segment.relationship.type].push(end);
					}
				}
			}
		}
	}

	const redundant = [];

	// Go through each node and, if it has a child
	// - find it in the hash
	// - attach it to the current node (parent)
	// - delete it from the hash
	for (let key in hash) {
		if (hash.hasOwnProperty(key)) {
			const node = hash[key];
			const rships = node.relationships;

			for (let rshipKey in rships) {
				if (rships.hasOwnProperty(rshipKey)) {

					const rshipsOfType = rships[rshipKey];

					for (let nodeKey in rshipsOfType) {
						if (rshipsOfType.hasOwnProperty(nodeKey)) {
							const endNode = rshipsOfType[nodeKey];

							// this child node has further children
							if (hash[endNode.id]) {
								endNode.relationships = hash[endNode.id].relationships;
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
		delete hash[id];
	}

	return hash;
};
