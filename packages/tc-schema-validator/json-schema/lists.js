// holds lists of types, got from the schema, to use for cross-referencing
const sdk = require('./sdk');

const primitiveTypesMap = sdk.getPrimitiveTypes();
const enums = sdk.rawData.getEnums();
const stringPatterns = sdk.rawData.getStringPatterns();

const arrayToRegExp = arr => new RegExp(`^(${arr.join('|')})$`);
const validStringPatternsRX = arrayToRegExp(Object.keys(stringPatterns));
const validEnums = Object.keys(enums);

const typeNames = sdk.getTypes().map(({ name }) => name);
const relationshipTypeNames = [...new Set(sdk
	.getRelationshipTypes()
	.map(({ name }) => name).filter(it => !!it))];
const declaredTypeNames = [].concat(typeNames, relationshipTypeNames);

const validPropTypes = validEnums.concat(
	Object.keys(primitiveTypesMap),
	declaredTypeNames,
);

module.exports = {
	allTypes: validPropTypes,
	enums: validEnums,
	relationshipTypes: relationshipTypeNames,
	types: typeNames,
	simpleTypes: validEnums.concat(Object.keys(primitiveTypesMap)),
	complexTypes: typeNames.concat(relationshipTypeNames),
	stringPatterns: Object.keys(stringPatterns),
};
