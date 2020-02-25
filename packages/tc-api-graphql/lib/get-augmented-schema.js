const logger = require('@financial-times/n-logger').default;
const { makeAugmentedSchema } = require('neo4j-graphql-js');
const { applyMiddleware } = require('graphql-middleware');
const { parse } = require('graphql');
const { getGraphqlDefs, getTypes } = require('@financial-times/tc-schema-sdk');
const fetch = require('node-fetch');
const { middleware: requestTracer } = require('./request-tracer');

const resolveDocumentProperty = async ({ code }, args, context, info) => {
	if (!code) {
		throw new Error(
			'Must include code in body of query that requests any Document properties',
		);
	}
	const key = `${info.parentType.name}/${code}`;
	const record = await context.documentStoreDataLoader.load(key);
	return record[info.fieldName];
};

const getDocumentResolvers = () => {
	const typeResolvers = {};
	const types = getTypes();
	types.forEach(type => {
		const nodeProperties = type.properties;
		const documentResolvers = {};
		Object.keys(nodeProperties).forEach(prop => {
			if (nodeProperties[prop].type === 'Document') {
				documentResolvers[prop] = resolveDocumentProperty;
			}
		});
		if (Object.keys(documentResolvers).length) {
			typeResolvers[type.name] = documentResolvers;
		}
	});
	return typeResolvers;
};

const getAugmentedSchema = ({ documentStore }) => {
	const typeDefs = getGraphqlDefs();
	// this should throw meaningfully if the defs are invalid;
	parse(typeDefs.join('\n'));

	const resolvers = {};

	typeDefs.push(`
type SOSDetail {
	weightedScore: Float
	successes: Int
	failings: Int
	ok: Int
	info: Int
	warning: Int
	error: Int
	critical: Int
}

extend type System {
	sosWeightedScore: Float
	sosCriticalErrors: Int
}
`);

	resolvers.System = {
		// sosDetail: async ({ code }, args, context, info) => {
		// 	try {
		// 		const it = await context.sosDataLoader.load(code);

		// 		console.log({it})
		// 		// return 10;
		// 		return it
		// 	} catch (e) {
		// 		return null;
		// 	}
		// },
		sosWeightedScore: async ({ code }, args, context, info) => {
			try {
				const it = await context.sosDataLoader.load(code);
				return it.weightedScore
			} catch (e) {
				console.log(e)
				return null;
			}
		},
		sosCriticalErrors: async ({ code }, args, context, info) => {
			try {
				const it = await context.sosDataLoader.load(code);
				return it.critical
			} catch (e) {
				return null;
			}
		},
	};

	resolvers.SOSDetail = [
		'weightedScore',
		'successes',
		'failings',
		'ok',
		'info',
		'warning',
		'error',
		'critical',
	].reduce((resolve, name) => ({ ...resolve, [name]: (obj = {}) => obj[name] }), {});

	const schema = makeAugmentedSchema({
		typeDefs: typeDefs.join('\n'),
		logger: {
			log(message) {
				logger.error(`GraphQL Schema: ${message}`, {
					event: 'GRAPHQL_SCHEMA_ERROR',
				});
			},
		},
		resolvers,
		config: {
			query:
			{
				exclude: ['SOSDetail'],
			},
			mutation: false,
			debug: true,
		},
	});

	return applyMiddleware(schema, requestTracer);
};

module.exports = {
	getAugmentedSchema,
};
