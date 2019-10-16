const logger = require('@financial-times/n-logger').default;
const { makeAugmentedSchema } = require('neo4j-graphql-js');
const { parse } = require('graphql');
const { applyMiddleware } = require('graphql-middleware');
const {
	getGraphqlDefs,
	getTypes,
} = require('../../../../../packages/schema-sdk');

let defs;

const propertyUsageMiddleware = async (resolve, parent, args, context, info) => {
	if (info.parentType.name !== 'Query') {
		context.trace.collect(info.parentType.name, info.fieldName);
	}
	return resolve(parent, args, context, info);
};

const getAugmentedSchema = () => {
	const typeDefs = defs || getGraphqlDefs();
	// this should throw meaningfully if the defs are invalid;
	parse(typeDefs.join('\n'));
	const schema = makeAugmentedSchema({
		typeDefs: [
			`
directive @deprecated(
  reason: String = "No longer supported"
) on FIELD_DEFINITION | ENUM_VALUE | ARGUMENT_DEFINITION`,
		]
			.concat(typeDefs)
			.join('\n'),
		logger: {
			log(message) {
				logger.error(`GraphQL Schema: ${message}`, {
					event: 'GRAPHQL_SCHEMA_ERROR',
				});
			},
		},
		config: { query: true, mutation: false, debug: true },
	});
	return applyMiddleware(schema, propertyUsageMiddleware);
};

module.exports = {
	getAugmentedSchema,
};
