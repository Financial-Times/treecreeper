const logger = require('@financial-times/n-logger').default;
const { makeAugmentedSchema } = require('neo4j-graphql-js');
const { applyMiddleware } = require('graphql-middleware');
const { parse } = require('graphql');
const { getGraphqlDefs, getTypes } = require('@financial-times/tc-schema-sdk');

const { middleware: requestTracer } = require('./request-tracer');
const { resolveDocumentProperty, resolveTCO } = require('./custom-resolvers');

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
	const resolvers = documentStore ? getDocumentResolvers() : {};
	const typeDefs = getGraphqlDefs();

	typeDefs.push(
		`type AWSCostBreakdown {
			cost: Float
			formatted: String
		}`,
		`type HerokuCostBreakdown {
			cost: Float
			formatted: String
		}`,
		`type Total {
			cost: Float
			formatted: String
		}`,

		`type HerokuCostBreakdown {
			cost: Float
			formatted: String
		}`,
		`type CostBreakdown {
			aws: AWSCostBreakdown
			heroku: HerokuCostBreakdown
			totalCost: Total
		}`,
		`
	extend type System {
		tco: CostBreakdown @neo4j_ignore
   }`,
	);

	// this should throw meaningfully if the defs are invalid;
	parse(typeDefs.join('\n'));

	// add custom resolver for getting TCO(Total Cost of Ownership) data
	resolvers.System = {
		tco: resolveTCO,
	};

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
			query: true,
			mutation: false,
			debug: true,
		},
	});

	return applyMiddleware(schema, requestTracer);
};

module.exports = {
	getAugmentedSchema,
};
