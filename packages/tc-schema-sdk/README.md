# @financial-times/tc-schema-sdk

In many ways, this is the beating heart of Treecreeper. It consumes the schema files that define what sort of records can be stored in the neo4j instance, and what relationships can exist between them. These schema files may exist locally or be hosted somewhere remote. Once these files are consumed, schema-sdk then takes care of:

-   Updating the schema held locally when the remote copy changes, and making sure the change to the schema is propagated everywhere within the application
    Generating the GraphQl SDL schema that underlies the graphql API
-   Providing methods that allow validation of input data against the schema
-   Providing utility methods that allow various aspects of the schema to be interrogated and used for e.g. constructing a UI for the data

## Installation and usage

`npm install @financial-times/tc-schema-sdk`

The package exports a singleton instance, and once initialised, `@financial-times/biz-ops-schema` can be required multiple times in the application. It should be initialised _once and once only per application_. It also exports a reference to the underlying `SDK` class, but this is only exposed for use by other packages' integration tests.

### Initialisation

This is a little odd (and should be improved in future)

-   When using local, static data (`schemaDirectory` or `schemaData` options below), the `init()` method populates the sdk with data immediately and its methods can be used to access the data immediately
-   When using remote data (`schemaBaseUrl`), no data is populated, and `schema.ready()` must be awaited before using the sdk's synchronous methods.

Be aware of the idiosyncrasy above if you ever come across errors complaining that no data is available.

#### Lifecycle guide

-   `schema.init()` - configures the schema library, telling it where to fetch the schema from and which methodology to use to update it in memory (these vary depending on lambda vs express and test vs prod).
-   `schema.ready()` - makes the initial fetch for data and starts the polling interval. Returns a promise that resolves when the first set of data has been stored in memory.
-   `schema.getType()` etc, attempts to read to read data synchronously from memory. Errors if schema.ready() has not resolved yet

So initialising is always a synchronous step (`init`), followed by an asynchronous step (`ready`) you need to await once, and then after that all the other method calls should be synchronous.

The one exception is a call to `schema.refresh()` - asynchronous which must be called at the beginning of each lambda event handled because the background long-polling pattern does not work in lambda.

### `init(options)`

The package exports an `init(options)` function, that takes the following options:

-   `schemaDirectory` - absolute path to a directory that contains schema files as yaml. Will use the `TREECREEPER_SCHEMA_DIRECTORY` environment variable if defined. This is the preferred way of specifying the directory
-   `schemaData` - a javascript object containing a complete Treecreeper schema. Generally only used in tests
-   `schemaBaseUrl` - The root url the sdk will look under to retrieve new versions of the schema. This should be the same url the `schema-publisher` package publishes to
-   `ttl` (default 60000) - when fetching the schema from a url, the time in milliseconds to cache the schema locally for before checking for updates
-   `updateMode` - 'poll' or 'stale'. 'poll' will start polling on an interval for schema updates, whereas 'stale' will fetch whenever a user calls the sdk's `refresh()` method and the schema is older than the `ttl`
-   `logger` (default `console`) - choice of logger to use in the sdk
-   `version` - used to specify the version of the schema being used. Only used in tests
-   `includeTestDefinitions` - (default: `false`) a flag to indicate whether to use schema definitions that are flagged as test only using `isTest: true`
    One of `schemaDirectory`, `schemaData` or `schemaBaseUrl` must be defined. If `schemaBaseUrl` is defined, then `updateMode` must also be defined.

### Update APIs

-   `init(options)` - described above
-   `ready()` - returns a `Promise` that resolves once the schem-sdk has loaded the schema files
-   `onChange(func)` method, that can be used to attach handlers that need to respond when the schema changes.
-   `refresh()` - used to update the schema when sdk has `updateMode: 'stale'`

### Examples

#### Persistent nodejs process (e.g. heroku)

```js
const { init, ready } = require('@financial-times/tc-schema-sdk');
init({
	schemaUrl: 'http://my-static-host.com/treecreeper-schema',
	updateMode: 'poll',
	logger: require('@financial-times/n-logger'), // or whichever logger you prefer
	ttl: 10000, // in milliseconds, defaults to 60000
});

ready().then(() => {
	// you can now start your app and use the schema
});
```

#### Transient nodejs process (e.g. AWS lambda)

```js
const { init, ready } = require('@financial-times/biz-ops-schema');
init({
	schemaUrl: 'http://my-static-host.com/treecreeper-schema',
	updateMode: 'stale',
	logger: require('@financial-times/lambda-logger'), // or whichever logger you prefer
	ttl: 10000, // in milliseconds, defaults to 60000
});

// in your function handler
const handler = async event => {
	await ready();
	// now go ahead
};
```

#### Local development

When working with local schema files, set the environment variable `TREECREEPER_SCHEMA_DIRECTORY` to the absolute path where your schema files live. This will override any other settings you have for schema updating.

### Schema access APIs

All methods use an internal caching mechanism, which is flushed whenever the schema updates. For this reason

-   it is safe to call these methods many times because the complex transformation of values is only executed on the first invocation
-   it is an antipattern to store the result of any invocation in a variable for any _non synchronous_ period of time - this may result in incorrect reading or writing of data

### getType(type, options)

Get an object defining the structure of a given `type`. The following transforms will be executed on the raw yaml data.

-   if no `pluralName` field is defined, it will be generated
-   any named stringPatterns will be converted to validation functions

The full object structure returned by getType() can been seen [here](GETTYPE.md)

#### options

-   `withRelationships` [default: `true`]: Include the relationships for the type, expressed as graphql property definitions.
-   `groupProperties` [default: `false`]: Each property may have a `fieldset` attribute. Setting `groupProperties: true` removes the `properties` object from the data, and replaces it with `fieldsets`, where all properties are then grouped by fieldset
-   `includeMetaFields` [default: `false`]: Determines whether to include metadatafields (prefixed with `_`) in the schema object returned
-   `includeSyntheticFields` [default: `true`]: Determines whether to include synthetic fields (those using a custom cypher statement) in the schema object returned
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

Should be used when reading a type name from e.g. a url. Currently is a noop, but will allow consistent rolling out of more forgiving url parsing in future if necessary

_The methods below are unimplemented_

### describeGraphqlQuery(query)

Decorates a graphql query with metadata from the schema

### describeGraphqlResult(query, result)

### describeRestApiResult(type, result, options)
