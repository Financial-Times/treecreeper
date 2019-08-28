const logger = require('@financial-times/n-logger').default;
const partialRight = require('lodash/partialRight');
const { makeAugmentedSchema } = require('neo4j-graphql-js');
const { parse } = require('graphql');
const {
	getTypes,
	getEnums,
	getGraphqlDefs,
} = require('../../../../../packages/schema-sdk');

const S3DocumentsHelper = require('../../rest/lib/s3-documents-helper');
const s3 = new S3DocumentsHelper();

const createSchema = () => {
	const typeDefs = getGraphqlDefs();
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
		resolvers: {
			// Query: {
				System: {
					monitoring: async (query,resultSoFar,c,context) => {
						const code = query.code || resultSoFar.code;
						if (!code) {
							throw new Error('must include code in body of query that requests large docs');
						}
						console.log(context.parentType.name)
						const docs = await s3.getFileFromS3(context.parentType.name, code);
						console.log(docs)
						return docs[context.fieldName]
					}
				}
			// }
		},
		config: { query: true, mutation: false, debug: true },
	});
	return schema;
};

module.exports = { createSchema };
