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
			console.log(type);
			// const { properties } = getType(type);
			// 	fields = [...fields];
			// 	logger[logType]({
			// 		event: 'GRAPHQL_TRACE',
			// 		success: logType !== 'error',
			// 		type,
			// 		fields,
			// 		deprecatedFields: fields.filter(
			// 			name => !!properties[name].deprecationReason,
			// 		),
			// 	});
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
		tracing: true,
		schema: getAugmentedSchema(),
		context: ({ req: { headers } }) => {
			const s3DocsDataLoader = new DataLoader(async keys => {
				const [type, code] = keys[0].split('/');
				const record = await s3.getFileFromS3(type, code);
				return [record];
			});
			return {
				driver,
				s3DocsDataLoader,
				headers,
				trace,
			};
		},
		formatResponse(response) {
			trace.log();
			return response;
		},
		// formatError(error) {
		// 	const isS3oError = /Forbidden/i.test(error.message);
		// 	trace.error();
		// 	logger.error('GraphQL Error', {
		// 		event: 'GRAPHQL_ERROR',
		// 		error,
		// 	});
		// 	const displayedError = isS3oError
		// 		? new Error(
		// 				'FT s3o session has expired. Please reauthenticate via s3o - i.e. refresh the page if using the graphiql explorer',
		// 		  )
		// 		: error;
		// 	return formatError(displayedError);
		// },
	});

	return apollo.getMiddleware({ path: '/' });
};

module.exports = { getApolloMiddleware };
