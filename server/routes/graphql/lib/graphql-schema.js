const logger = require('@financial-times/n-logger').default;
const { makeAugmentedSchema } = require('neo4j-graphql-js');
const { getTypes, getGraphqlDefs } = require('@financial-times/biz-ops-schema');
const { parse } = require('graphql');

const getDocs = async (obj, args, context, info) => {
	const key = `${info.parentType.name}/${obj.code}`;
	const record = await context.s3DocsDataLoader.load(key);
	return record[info.fieldName];
};

const getResolvers = () => {
	const types = getTypes();
	const typeResolvers = {};
	types.forEach(type => {
		const nodeProperties = type.properties;
		const documentResolvers = {};
		Object.keys(nodeProperties).forEach(prop => {
			if (nodeProperties[prop].type === 'Document') {
				documentResolvers[prop] = getDocs;
			}
		});
		if (Object.keys(documentResolvers).length) {
			typeResolvers[type.name] = documentResolvers;
		}
	});
	return typeResolvers;
};

const createSchema = () => {
	const typeDefs = getGraphqlDefs();
	// this should throw meaningfully if the defs are invalid;
	parse(typeDefs.join('\n'));

	typeDefs.unshift(`
directive @deprecated(
  reason: String = "No longer supported"
) on FIELD_DEFINITION | ENUM_VALUE | ARGUMENT_DEFINITION`);

	const schema = makeAugmentedSchema({
		typeDefs: typeDefs.join('\n'),
		logger: {
			log(message) {
				logger.error(`GraphQL Schema: ${message}`, {
					event: 'GRAPHQL_SCHEMA_ERROR',
				});
			},
		},
		resolvers: getResolvers(),
		config: { query: true, mutation: false, debug: true },
	});
	return schema;
};

module.exports = { createSchema };
