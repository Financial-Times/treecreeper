// holds lists of types, got from the schema, to use for cross-referencing
const sdk = require('../sdk');

const primitiveTypesMap = sdk.getPrimitiveTypes();
const enums = sdk.rawData.getEnums();
const stringPatterns = sdk.rawData.getStringPatterns();
const validEnums = Object.keys(enums);
const typeNames = sdk.rawData.getTypes().map(({ name }) => name);
const relationshipTypeNames = [
	...new Set(sdk.rawData.getRelationshipTypes().map(({ name }) => name)),
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
	SYSTEM_CODE: '^[a-z][\\-a-z]+[a-z]$',
	TYPE_NAME: '^[A-Z][a-zA-Z]+$',
	CAPITAL_SNAKE_CASE: '^(?=.{2,64}$)[A-Z][A-Z_]*[A-Z]$',
	PROPERTY_NAME: '^(?=.{2,64}$)[a-z][a-zA-Z\\d]+$',
	ENUM_NAME: '^[A-Z][a-zA-Z]+$',
	ENUM_OPTION: '^[a-zA-Z]+$',
};
