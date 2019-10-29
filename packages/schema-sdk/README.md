# @treecreeper/schema-sdk

In many ways, this is the beating heart of Treecreeper&TM;. It consumes the schema files that define what sort of records can be stored in the neo4j instance, and what relationships can exist between them. These schema files may exist locally or be hosted somewhere remote. Once these files are consumed, schema-sdk then takes care of:
- Updating the schema held locally when the remote copy changes, and making sure the change to the schema is propagated everywhere within the application
Generating the GraphQl SDL schema that underlies the graphql API
- Providing methods that allow validation of input data against the schema
- Providing utility methods that allow various aspects of the schema to be interrogated and used for e.g. constructing a UI for the data

## Installation and usage

`npm install @treecreeper/schema-sdk`

The package exports a singleton instance, and once initialised, `@financial-times/biz-ops-schema` can be required multiple times in the application. It should be initialised _once and once only per application_. It also exports a reference to the underlying `SDK` class, but this is only exposed for use by other packages' integration tests.

### Initialisation
The package exports an `init(options)` function, that takes the following options
```


```

It also exports a `ready()` method, that returns a `Promise` that resolves once the schem-sdk has loaded the schema files, and an `onChange()` method, that can be used to attach handlers that need to respond when the schema changes.


### Persistent nodejs process (e.g. heroku)

```js
const { init, ready } = require('@financial-times/biz-ops-schema');
init({
	schemaUrl: process.env.SCHEMA_BASE_URL,
	updateMode: 'poll',
	logger: require('n-logger'), // or whichever logger you prefer
	ttl: 10000, // in milliseconds, defaults to 60000
});

ready().then(() => {
	// you can now start your app and use the schema
});
```

### Transient nodejs process (e.g. AWS lambda)

```js
const { init, ready } = require('@financial-times/biz-ops-schema');
init({
	schemaUrl: process.env.SCHEMA_BASE_URL,
	updateMode: 'stale',
	logger: require('n-lambda-logger'), // or whichever logger you prefer
	ttl: 10000, // in milliseconds, defaults to 60000
});

// in your function handler
const handler = async event => {
	await ready();
	// now go ahead
};
```

Speak to a member of the [biz ops team](https://financialtimes.slack.com/messages/C9S0V2KPV) to obtain a suitable value for `SCHEMA_BASE_URL` (it's just an S3 bucket).

### Local development

When working with local schema files, set the environment variable `TREECREEPER_SCHEMA_DIRECTORY` to the path, relative to the current working directory, of your schema files.

## Adding to the schema

See [CONTRIBUTING.md](CONTRIBUTING.md)

## Releasing

Create an appropriate semver tag:

-   for additions to the schema release as a patch
-   for additions to the api relase as a minor
-   breaking changes to the API or changes to the structure of data in the yaml files should be released as major

### Release process details

![image](https://user-images.githubusercontent.com/447559/55995243-e4d77800-5cab-11e9-8713-8d0ea7485108.png)

Creating a github tag (1.) triggers a circleci build (2.) which, on success, publishes the schema files to s3 on the path `/latest/vX.json` (where X is the major version) (3a.), and publishes the javascript library to NPM (3b.). biz-ops-api polls `/latest/vX.json` (4.) and when an update is detected, it constructs and updated graphQL api, then publishes the schema file to `/api/vX.json` (5.). biz-ops-admin and other secondary consumers of the data poll `/api/vX.json` for updates to the schema (6.).

The reasoning behind this solution can be seen [in this gist](https://gist.github.com/wheresrhys/dd4c5d856812e0fb8c705feeabffd754)

## API

All methods use an internal caching mechanism, whih is flushed whenever the schema updates. For this reason

-   it is safe to call these methods many times because the complex transformation of values is only executed on the first invocation
-   it is an antipattern to store the result of any invocation in a variable for any _non synchronous_ period of time - this may result in incorrect reading or writing of data

### getType(type, options)

Get an object defining the structure of a given `type`. The following transforms will be executed on the raw yaml data.

-   if no `pluralName` field is defined, it will be generated
-   any named stringPatterns will be converted to validation functions

The full object structure returned by getType() can been seen [here](GETTYPE.md)

#### options

-   `withRelationships` [default: `true`]: Include the relationships for the type, expressed as graphql property definitions.
-   `primitiveTypes` [default: `'biz-ops'`]: Graphql only has 4 primitive types - String, Boolean, Int and Float - whereas the biz-ops ecosystem recognises a richer variety e.g Document, Url. They are stored in the schema as these biz-ops types. Setting `primitiveTypes: 'graphql'` will output property type names converted to their graphql equivalent. This option shouldn't really be needed by anywhere other than the graphql server
-   `groupProperties` [default: `false`]: Each property may have a `fieldset` attribute. Setting `groupProperties: true` removes the `properties` object from the data, and replaces it with `fieldsets`, where all properties are then grouped by fieldset
-   `includeMetaFields` [default: `false`]: Determines whether to include metadatafields (prefixed with `_`) in the schema object returned
-   `useMinimumViableRecord` [default: `false`]: If `groupProperties` is `true`, this will put any fields defined as being part of the minimum viable record (see [model spec](MODEL_SPECIFICATION.md#types)) together in a single fieldset

### getTypes(options)

Get an array of objects defining the structure of all types. All `options` for `getType` are supported and determine the internal structure of each type. Additionally, the following options can be specified:

-   `grouped` [default: `false`] - determines whether to return the types as a flat array, or an object grouping types in categories. Each category specifies a label, description and list of types.

### getEnums(options)

Retrieves an array of key:value objects defining the acceptable values of an enum

#### options

-   `withMeta`: wrap the enum in an object which also has metadata about the enum (e.g. 'description'.). In this case, the actual enum options will be in a `options` property

### validateTypeName(typeName)

Validates that a type of the given name exists in the schema

### validateCode (typeName, code)

Validates that a code string matches the validation pattern defined for codes for the given type

### validatePropertyName ( propertyName )

Validates that a string is a valid name for an attribute (i.e. camelCase)

### validateProperty(typeName, propertyName, propertyValue)

Validates that the value of a property for a given type is valid

### getGraphQLDefs()

Retrieves graphql defs to be used to power a graphql api

### normalizeTypeName

Should be used when reading a type name from e.g. a url. Currently is a noop, but will allow consistent rolling out of more forgiving url parsing in futre if necessary

_The methods below are unimplemented_

### describeGraphqlQuery(query)

Decorates a graphql query with metadata from the schema

### describeGraphqlResult(query, result)

### describeRestApiResult(type, result, options)
