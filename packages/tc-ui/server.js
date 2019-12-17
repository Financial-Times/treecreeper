const primitives = require('./primitives/server');

const { componentAssigner, graphqlQueryBuilder } = require('./lib/mappers');

module.exports = {
	primitives,
	componentAssigner,
	graphqlQueryBuilder,
};
