// holds lists of types, got from the schema, to use for cross-referencing
const sdk = require('../sdk');

const primitiveTypesMap = sdk.getPrimitiveTypes();
const enums = sdk.rawData.getEnums();
const stringPatterns = sdk.rawData.getStringPatterns();
const validEnums = Object.keys(enums);

const typeNames = sdk.getTypes().map(({ name }) => name);
const relationshipTypeNames = [
	...new Set(
		sdk
			.getRelationshipTypes()
			.map(({ name }) => name)
			.filter(it => !!it),
	),
];
const primitiveTypeNames = Object.keys(primitiveTypesMap);

module.exports = {
	allTypes: [
		...typeNames,
		...relationshipTypeNames,
		...validEnums,
		...primitiveTypeNames,
	],
	enums: validEnums,
	relationshipTypes: relationshipTypeNames,
	types: typeNames,
	simpleTypes: [...validEnums, ...primitiveTypeNames],
	complexTypes: [...typeNames, ...relationshipTypeNames],
	stringPatterns: Object.keys(stringPatterns),
};
