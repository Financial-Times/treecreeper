const primitives = require('./primitives/server');

const { componentAssigner, graphqlQueryBuilder } = require('./lib/mappers');
const { ApiClient } = require('./lib/api-client');
const { getSchemaSubset } = require('./lib/get-schema-subset');

module.exports = {
	primitives,
	componentAssigner,
	graphqlQueryBuilder,
	ApiClient,
	getSchemaSubset,
};

/*
init ({
	apiBaseUrl,
	apiHeaders,
	customComponents = {},
	customTypeMappings = {},
})



*/
