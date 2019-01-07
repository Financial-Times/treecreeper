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
      versionControlSystem
    }
    recursiveDependencies {
      code
    }
  }
}`;

module.exports = DEFAULT_QUERY;
