const logger = require('@financial-times/n-logger').default;
const { makeAugmentedSchema } = require('neo4j-graphql-js');
const { parse } = require('graphql');
const EventEmitter = require('events');
const {
	getGraphqlDefs,
	onChange,
} = require('../../../../../packages/schema-sdk');

const schemaEmitter = new EventEmitter();

let defs;

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
	return schema;
};

onChange(() => schemaEmitter.emit('schemaUpdate', getAugmentedSchema()));

module.exports = { schemaEmitter, getAugmentedSchema };

setTimeout(() => {
	defs = [
		`
scalar DateTime
scalar Date
scalar Time
"""
Some business function carried out at FT e.g. ability to publish the news, ability to pay staff...

"""
type BusinessCapability {

  """
  The unique identification code for the capability. When creating a new capability,
  choose a lower case, hyphenated string similar to the name people call the capability.

  """
  code: String
  """
  The name generally used to refer to the capability.

  """
  namette: String

},

type Query {


	"""
	Some business function carried out at FT e.g. ability to publish the news, ability to pay staff...

	"""
	BusinessCapability(


    """
    The unique identification code for the capability. When creating a new capability,
    choose a lower case, hyphenated string similar to the name people call the capability.

    """
    code: String
    """
    The name generally used to refer to the capability.

    """
    namette: String
	): BusinessCapability

	"""
	Some business function carried out at FT e.g. ability to publish the news, ability to pay staff...

	"""
	BusinessCapabilities(

    """
    The pagination offset to use
    """
    offset: Int = 0
    """
    The number of records to return after the pagination offset. This uses the default neo4j ordering
    """
    first: Int = 20000

    """
    The unique identification code for the capability. When creating a new capability,
    choose a lower case, hyphenated string similar to the name people call the capability.

    """
    code: String
    """
    The name generally used to refer to the capability.

    """
    namette: String

	): [BusinessCapability]

}

	`,
	];
	console.log('emiting');
	schemaEmitter.emit('schemaUpdate', getAugmentedSchema());
}, 5000);
