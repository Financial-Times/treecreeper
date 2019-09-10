const logger = require('@financial-times/n-logger').default;
const { makeAugmentedSchema } = require('neo4j-graphql-js');
const { parse } = require('graphql');
const {
	getGraphqlDefs,
	getTypes,
} = require('../../../../../packages/schema-sdk');

let defs;

const getDocs = async (obj, args, context, info) => {
	const code = obj.code || args.code;
	if (!code) {
		throw new Error(
			'must include code in body of query that requests large docs',
		);
	}
	const key = `${info.parentType.name}/${code}`;
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
		resolvers: getResolvers(),
		config: { query: true, mutation: false, debug: true },
	});

	return schema;
};

module.exports = {
	getAugmentedSchema,
};

// setTimeout(() => {
// 	defs = [
// 		`
// scalar DateTime
// scalar Date
// scalar Time
// """
// Some business function carried out at FT e.g. ability to publish the news, ability to pay staff...

// """
// type BusinessCapability {

//   """
//   The unique identification code for the capability. When creating a new capability,
//   choose a lower case, hyphenated string similar to the name people call the capability.

//   """
//   code: String
//   """
//   The name generally used to refer to the capability.

//   """
//   namette: String

// },

// type Query {

// 	"""
// 	Some business function carried out at FT e.g. ability to publish the news, ability to pay staff...

// 	"""
// 	BusinessCapability(

//     """
//     The unique identification code for the capability. When creating a new capability,
//     choose a lower case, hyphenated string similar to the name people call the capability.

//     """
//     code: String
//     """
//     The name generally used to refer to the capability.

//     """
//     namette: String
// 	): BusinessCapability

// 	"""
// 	Some business function carried out at FT e.g. ability to publish the news, ability to pay staff...

// 	"""
// 	BusinessCapabilities(

//     """
//     The pagination offset to use
//     """
//     offset: Int = 0
//     """
//     The number of records to return after the pagination offset. This uses the default neo4j ordering
//     """
//     first: Int = 20000

//     """
//     The unique identification code for the capability. When creating a new capability,
//     choose a lower case, hyphenated string similar to the name people call the capability.

//     """
//     code: String
//     """
//     The name generally used to refer to the capability.

//     """
//     namette: String

// 	): [BusinessCapability]

// }

// 	`,
// 	];
// 	console.log('emiting');
// 	schemaEmitter.emit('schemaUpdate', getAugmentedSchema());
// }, 5000);
