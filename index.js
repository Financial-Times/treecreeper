const type = require('./methods/get-type');
const types = require('./methods/get-types');
const enums = require('./methods/get-enums');
const graphqlDefs = require('./methods/get-graphql-defs');
const primitiveTypes = require('./lib/primitive-types-map');
const sendToS3 = require('./lib/send-to-s3');

module.exports = Object.assign(
	{
		getType: type,
		getTypes: types,
		getEnums: enums,
		getGraphqlDefs: graphqlDefs,
		normalizeTypeName: name => name,
		primitiveTypesMap: primitiveTypes,
		sendToS3,
	},
	require('./lib/validate'),
);
