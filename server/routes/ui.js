const security = require('../middleware/security');
const { graphiqlExpress } = require('apollo-server-express');

const DEFAULT_QUERY = `{
  System(code: "biz-ops-api") {
    name
    serviceTier
    primaryURL
    supportedBy {
      name
      isThirdParty
      slack
      email
    }
    deliveredBy {
      name
      isThirdParty
      slack
      email
      techLeads {
        name
        email
      }
      productOwners {
        name
        email
      }
    }
    knownAboutBy {
      name
    }
    repositories {
      url
      mostRecentCircleCIPlatform
      storedIn {
        name
      }
    }
  }
}`;

module.exports = router => {
	router.use(
		'/graphiql',
		security.requireS3o,
		graphiqlExpress({
			endpointURL: '/graphiql',
			query: DEFAULT_QUERY
		})
	);

	return router;
};
