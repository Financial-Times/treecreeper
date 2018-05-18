const logger = require('@financial-times/n-logger').default;
const {
	makeExecutableSchema,
	addMockFunctionsToSchema
} = require('graphql-tools');
const fs = require('fs');
const path = require('path');
const resolvers = require('./resolvers');

const typeDefs = () =>
	fs.readFileSync(path.join(__dirname, './typeDefs.graphql'), 'utf-8');

module.exports = makeExecutableSchema({
	typeDefs: typeDefs(),
	resolvers: resolvers.all,
	logger: {
		log(message) {
			logger.error(`GraphQL Schema: ${message}`, {
				event: 'GRAPHQL_SCHEMA_ERROR'
			});
		}
	}
});

module.exports.createMockSchema = mocks => {
	const schema = makeExecutableSchema({
		typeDefs: typeDefs(),
		resolvers: resolvers.enumResolvers
	});
	addMockFunctionsToSchema({
		schema,
		mocks
	});
	return schema;
};
