'use strict';

const logger = require('@financial-times/n-logger').default;
const { makeExecutableSchema } = require('graphql-tools');
const fs = require('fs');
const path = require('path');
const resolvers = require('./resolvers');

module.exports = makeExecutableSchema({
	typeDefs: fs.readFileSync(
		path.join(__dirname, './typeDefs.graphql'),
		'utf-8'
	),
	resolvers,
	logger: {
		log(message) {
			logger.error(`GraphQL Schema: ${message}`, {
				event: 'GRAPHQL_SCHEMA_ERROR',
			});
		},
	},
});
