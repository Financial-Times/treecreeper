const type = require('./type');
const graphqlDefs = require('./graphql-defs');
const enums = require('./enums');

const types = (rawData, getType) => (options = {}) =>
	rawData.getTypes().map(({ name }) => getType(name, options));

module.exports = rawData => {
	const getType = type(rawData);
	const getEnums = enums(rawData);
	const getTypes = types(rawData, getType);

	return {
		getType,
		getEnums,
		getTypes,
		getGraphqlDefs: graphqlDefs(getTypes, getEnums),
	};
};
