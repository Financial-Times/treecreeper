const primitives = require('./primitives/server');

const { componentAssigner, graphqlQueryBuilder } = require('./lib/mappers');
const { ApiClient } = require('./lib/api-client');
const { getSchemaSubset } = require('./lib/get-schema-subset');
const {getPageRenderer, FormError} = require('./page')
module.exports = {
	primitives,
	componentAssigner,
	graphqlQueryBuilder,
	ApiClient,
	getSchemaSubset,
	getPageRenderer,
	FormError
};

/*
init ({
	apiBaseUrl,
	apiHeaders,
	customComponents = {},
	customTypeMappings = {},
})



*/
