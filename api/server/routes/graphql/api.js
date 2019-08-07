const bodyParser = require('body-parser');
const timeout = require('connect-timeout');
const { formatError } = require('graphql');
const schema = require('../../../../schema');
const { logger, setContext } = require('../../lib/request-context');
const security = require('../../middleware/security');
const maintenance = require('../../middleware/maintenance');
const clientId = require('../../middleware/client-id');
const { TIMEOUT } = require('../../constants');
const { createSchema } = require('./lib/graphql-schema');
const { driver } = require('../../lib/db-connection');



const { ApolloServer, gql } = require('apollo-server-express');


let apollo;
let schemaVersionIsConsistent = true;

const constructAPI = () => {
	try {
		const newSchema = createSchema();
		if (!apollo) {
			apollo = new ApolloServer({
				schema: newSchema,
				context: ({req}) => ({
					driver,
			    headers: req.headers,
			  }),
			  formatError(error) {
					const isS3oError = /Forbidden/i.test(error.message);
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
			})
		} else {
			apollo.schema = newSchema;
		}

		schemaVersionIsConsistent = true;
		logger.info({ event: 'GRAPHQL_SCHEMA_UPDATED' });

		if (process.env.NODE_ENV === 'production') {
			schema
				.sendSchemaToS3('api')
				.then(() => {
					logger.info({ event: 'GRAPHQL_SCHEMA_SENT_TO_S3' });
				})
				.catch(error => {
					logger.error({
						event: 'SENDING_SCHEMA_TO_S3_FAILED',
						error,
					});
				});
		}
	} catch (error) {
		console.log(error)
		schemaVersionIsConsistent = false;
		logger.error(
			{ event: 'GRAPHQL_SCHEMA_UPDATE_FAILED', error },
			'Graphql schema update failed',
		);
	}
};

const bodyParsers = [
	bodyParser.json({ limit: '8mb' }),
	bodyParser.urlencoded({ limit: '8mb', extended: true }),
];

// schema.on('change', constructAPI);

setTimeout(() => {
	apollo.schema = createSchema(`
directive @deprecated(
  reason: String = "No longer supported"
) on FIELD_DEFINITION | ENUM_VALUE | ARGUMENT_DEFINITION

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
  name: String
  """
  Brief description of what the cabability is.

  """
  description: String


  """
  The client that was used to make the creation
  """
  _createdByClient: String
  """
  The user that made the creation
  """
  _createdByUser: String
  """
  The time and date this record was created
  """
  _createdTimestamp: DateTime
  """
  The client that was used to make the update
  """
  _updatedByClient: String
  """
  The last user to make an update
  """
  _updatedByUser: String
  """
  The time and date this record was last updated
  """
  _updatedTimestamp: DateTime
  """
  Autopopulated fields that are uneditable. This is an experimental feature that can be ignored.
  """
  _lockedFields: String
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
    name: String
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
    name: String
    """
    Brief description of what the cabability is.

    """
    description: String
    """
    The client that was used to make the creation
    """
    _createdByClient: String
    """
    The user that made the creation
    """
    _createdByUser: String
    """
    The time and date this record was created
    """
    _createdTimestamp: DateTime
    """
    The client that was used to make the update
    """
    _updatedByClient: String
    """
    The last user to make an update
    """
    _updatedByUser: String
    """
    The time and date this record was last updated
    """
    _updatedTimestamp: DateTime
    """
    Autopopulated fields that are uneditable. This is an experimental feature that can be ignored.
    """
    _lockedFields: String
	): [BusinessCapability]

}

	`)
}, 20000)
module.exports = router => {
	router.use(timeout(TIMEOUT));
	router.use((req, res, next) => {
		if (req.get('client-id')) {
			return clientId(req, res, next);
		}
		next();
	});

	router.use(security.requireApiKeyOrS3o);
	router.use(maintenance.disableReads);
	router.use(bodyParsers);

	router.use((req, res, next) => {
		res.nextMetricsName = 'graphql';
		setContext({ endpoint: 'graphql', method: req.method });
		logger.info({
			event: 'GRAPHQL_REQUEST',
			body: req.body,
		});
		next();
	});
	constructAPI();
	apollo.applyMiddleware({app: router, path:'/'})

	return router;
};

module.exports.checkSchemaConsistency = () => schemaVersionIsConsistent;
