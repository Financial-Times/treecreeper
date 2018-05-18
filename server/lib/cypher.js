const util = require('util');
/*
* Convert a javascript object into Neo4j Property format
*/
const stringify = object =>
	util.inspect(object, {
		showHidden: false,
		depth: null,
		colors: false,
		breakLength: Infinity
	});

/*
* Array.reduce accumulator
* takes a neo4j record and returns an object where keys are mapped to their field data
*/
const mapKeyToField = record => (result, key) =>
	Object.assign(result, { [key]: record._fields[record._fieldLookup[key]] });

/*
* Takes a neo4j response and maps the keys of each record to their corresponding field
*/
const parse = response =>
	response.map(record => record.keys.reduce(mapKeyToField(record), {}));

/*
Array.filter callback
Find unique object within an array based on the supplied key
*/
const uniqueRowsByKey = key => (item, index, self) =>
	index === self.findIndex(current => current[key] === item[key]);

const uniquePropertiesByKey = (key, records, propertyKey = 'id') =>
	records
		.filter(record => record[key])
		.map(record => record[key].properties)
		.filter(uniqueRowsByKey(propertyKey));

module.exports = {
	query: { stringify },
	res: { parse, mapKeyToField, uniqueRowsByKey, uniquePropertiesByKey }
};
