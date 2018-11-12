# biz-ops-schema

Schema for biz-ops data store and api. It provides two things:

- yaml files which define which types, properties and relationships are allowed. These are intended to be edited by anybody who wants to add to the things the api models
- a nodejs library for accessing subsets this information

## Releasing

1. Create an appropriate semver tag:

- for additions to the schema release as a patch
- for additions to the api relase as a minor

2. Checkout https://github.com/Financial-Times/biz-ops-api and `npm install @financial-times/biz-ops-schema@{the new version}`
3. Once this is merged to master, verify the https://dashboard.heroku.com/apps/biz-ops-api-staging app has deployed. If it all seems ok (try querying http://biz-ops-api-staging.herokuapp.com/graphiql for your new schema properties, or reading/writing a few dummy entries to the rest api. But use common sense, if you're just fixing a typo in a label or something, don't be too cautious)
4. Promote to production https://dashboard.heroku.com/apps/biz-ops-api
5. Follow something like 2 - 4 for https://github.com/Financial-Times/biz-ops-admin

### Future plans

The plan is to have non-breaking releases of this component do two things:

- Push schema files to s3 so they can be shared instantly. The js code in this component will poll s3 for the latest version
- Restart/kick the biz-ops-api app so that the graphql api reflects schema changes

So it's a bit of a painful process for now, but will improve

## API

### getType(type, options)

Get an object defining the structure of a given `type`. The following transforms will be executed on the raw yaml data.

- if no `pluralName` field is defined, it will be generated
- any named stringPatterns will be converted to validation functions

#### options

- `withRelationships` [default: `true`]: Include the relationships for the type, expressed as graphql property definitions.
- `primitiveTypes` [default: `'biz-ops'`]: Graphql only has 4 primitive types - String, Boolean, Int and Float - whereas the biz-ops ecosystem recognises a richer variety e.g Document, Url. They are stored in the schema as these biz-ops types. Setting `primitiveTypes: 'graphql'` will output property type names converted to their graphql equivalent. This option shouldn't really be needed by anywhere other than the graphql server
- `groupProperties` [default: `false`]: Each property may have a `section` attribute. Setting `groupProperties: true` removes the `properties` object from the data, and replaces it with `sections`, where all properties are grouped by section

### getAllTypes(options)

Get an array of objects definig the structure of all types. `options` are the same as for `getType`

### getEnums(options)

Retrieves an array of key:value object defining the acceptable values of an enum

#### options

- `withMeta`: wrap the enum in an object which also has metadata about the enum (e.g. 'description'.). In this case, the actual enum options will be in a `options` property

#### options

- `structure` [default: `flat`] - 'flat': returns an array of relationships, both incoming and outgoing, for the type - 'graphql': returns an array of relationships, both incoming and outgoing, for the type, including variants defined for graphql e.g. recursive traversal of relationships - 'rest': returns an object grouping relationships by relationship type

### validateTypeName(typeName)

Validates that a type of the given name exists in the schema

### validateCode (typeName, code)

Validates that a code string matches the validation pattern defined for codes for the given type

### validateAttributeNames ( attributes )

Validates that names used for attributes are valid (i.e. camelCase)

### validateAttributes(typeName, attributes, throwInfo)

Validates that attribute values fora given type comply with the schema. Checks the type of each attribute and any string patterns

### getGraphQLDefs()

Retrieves graphql defs to be used to power a graphql api

### normalizeTypeName

Should be used when reading a type name from e.g. a url. Currently is a noop, but will allow consistent rolling out of more forgiving url parsing in futre if necessary

_The methods below are unimplemented_

### describeGraphqlQuery(query)

Decorates a graphql query with metadata from the schema

### describeGraphqlResult(query, result)

### describeRestApiResult(type, result, options)
