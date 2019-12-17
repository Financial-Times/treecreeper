const primitives = require('./primitives/server');

const { componentAssigner, graphqlQueryBuilder } = require('./lib/mappers');
const { ApiClient } = require('./lib/api-client');

module.exports = {
	primitives,
	componentAssigner,
	graphqlQueryBuilder,
	ApiClient,
};

/*
init ({
	apiBaseUrl,
	apiHeaders,
	customComponents = {},
	customTypeMappings = {},
})



*/
