const { ApolloServer } = require('apollo-server-express');
const DataLoader = require('dataloader');
const { formatError } = require('graphql');
const { getAugmentedSchema } = require('./get-augmented-schema');
const { logger } = require('../../../lib/request-context');
const { driver } = require('../../../lib/db-connection');
const { getType } = require('../../../../../packages/schema-sdk');
const S3DocumentsHelper = require('../../rest/lib/s3-documents-helper');

const s3 = new S3DocumentsHelper();

class Tracer {
	constructor() {
		this.map = {};
	}

	collect(type, field) {
		this.map[type] = this.map[type] || new Set();
		this.map[type].add(field);
	}

	_log(logType) {
		Object.entries(this.map).map(([type, fields]) => {
			const { properties } = getType(type);
				fields = [...fields];
				logger[logType]({
					event: 'GRAPHQL_TRACE',
					success: logType !== 'error',
					type,
					fields
				});

				fields.filter(
					name => !!properties[name].deprecationReason,
				).map(field => logger.warn({
					event: 'GRAPHQL_DEPRECATION_TRACE',
					type,
					field
				}))
		});
	}

	log() {
		return this._log('info');
	}

	error() {
		return this._log('error');
	}
}

const getApolloMiddleware = () => {
	const trace = new Tracer();
	const apollo = new ApolloServer({
		subscriptions: false,
		schema: getAugmentedSchema(),
		context: ({ req: { headers } }) => {
			return {
				driver,
				headers,
				trace,
			};
		},
		formatResponse(response) {
			trace.log();
			return response;
		},
		formatError(error) {
			const isS3oError = /Forbidden/i.test(error.message);
			trace.error();
			logger.error('GraphQL Error', {
				event: 'GRAPHQL_ERROR',
				error,
			});
			const displayedError = isS3oError
				? new Error(
						'FT s3o session has expired. Please reauthenticate via s3o - i.e. refresh the page if using the graphiql explorer',
				  )
				: error;
			return formatError(displayedError);
		},
	});

	return apollo.getMiddleware({ path: '/' });
};

module.exports = { getApolloMiddleware };
