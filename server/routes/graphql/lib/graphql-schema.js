const logger = require('@financial-times/n-logger').default;
const { makeAugmentedSchema } = require('neo4j-graphql-js');
const { getType, getGraphqlDefs } = require('@financial-times/biz-ops-schema');
const { parse } = require('graphql');
const fetch = require('node-fetch');
const S3DocumentsHelper = require('../../rest/lib/s3-documents-helper');

const s3 = new S3DocumentsHelper();

const getDocs = async (query, resultSoFar, c, context) => {
	const code = query.code || resultSoFar.code;
	if (!code) {
		throw new Error(
			'must include code in body of query that requests large docs',
		);
	}
	const docs = await s3.getFileFromS3(context.parentType.name, code);
	return docs[context.fieldName];
};

const getResolvers = () => {
	const nodeProperties = getType('System').properties;
	const documentResolvers = {};
	Object.keys(nodeProperties).forEach(prop => {
		if (nodeProperties[prop].type === 'Document') {
			documentResolvers[prop] = getDocs;
		}
	});
	return {
		System: documentResolvers,
		Healthcheck: {
			code: async (query, resultSoFar) => {
				const url = query.url || resultSoFar.url;
				if (!url) {
					throw new Error(
						'must include url in body of query that requests large docs',
					);
				}
				return fetch(url).then(res => res.text());
			},
		},
	};
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
