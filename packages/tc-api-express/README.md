# @financial-times/tc-api-rest-express

Adds a treecreeper api to an express app. It provides

-   a GraphQL api
-   RESTful CRUD endpoints
-   Takes care of initialising a schema-sdk and api-db-manager, so that data structures automatically update

## API

### `getApp(options)`

Returns an express instance with the GraphQL and REST apis set up according to the options provided

A `treecreeper` object is attached to the express instance with the following properties

#### response

##### `logger`

A reference to treecreeper's internal logger, which decorates each log with useful application/request metadata

##### `isSchemaUpdating`

A function that returns a boolean indicating whether the application is successfully keeping the schema
that defines its data types up to date

##### `emitter` and `availableEvents`

See `tc-api-rest-handlers` for details

#### Options

##### `app`

An express app. If none is provided, one will be created

##### `schemaOptions`

Options to pass to `tc-schema-sdk`. Note that some options may be provided via environment variables

##### `treecreeperPath = '/'`

The path at which the treecreeper api is served

##### `graphqlPath = '/graphql'`

The path, relative to treecreeperPath, where the graphql api is served

##### `graphqlMethods = ['post']`

Methods accepted by the graphql api

##### `graphqlMiddlewares = []`

Array of middlewares to call before the graphql handler executes

##### `restPath = '/rest'`

The path, relative to treecreeperPath, where the REST api is served

##### `restMiddlewares = []`

Array of middlewares to call before the relevant REST handler executes

##### `documentStore`

An [optional] reference to a tc-api-s3-document-store instance (or a library implementing the same API), used to store large properties outside the neo4j instance

##### `options`

An [optional] object value for adding extra resolvers and typeDefs. It should have the following data structure

```
{
  options: {
    typeDefs: [
      `type ExtendedType {
        code: String
        someString: String
        someFloat: Float
        someEnum: AnEnum
      }`,
      `extend type MainType {
        extended: ExtendedType @neo4j_ignore *
        }`,],
    resolvers: {
      MainType: {
        extended: () => { ...custom resolver },
      },
    },
  }
}
```
*\* **@neo4j_ignore** must be added so that it is not used during the schema augmentation process*

##### `republishSchema`

A boolean indicating whether the application needs to republish the schema to somewhere once it has updated the graphqlApi. Note that republishing depends on a `TREECREEPER_SCHEMA_BUCKET` envioronment variable, which should be the name of an s3 bucket.

##### `republishSchemaPrefix = 'api'`

If the application needs to republish the schema to somewhere once it has updated the graphqlApi, this string indicates the
prefix to use

##### `timeout`

Optional integer to set maximum time DB will be queried for and, by association, maximum time a request can stay alive for
before being rejected and erroring

## Example

```js
const { getApp } = require('@financial-times/tc-api-rest-express');
const {
	authorization,
	rateLimiting,
	disableWrites,
} = require('../middlewares');
const PORT = process.env.PORT || 8888;

getApp({
	graphqlMethods: ['post', 'get'],
	graphqlMiddlewares: [authorization, rateLimiting],
	restMiddlewares: [authorization, rateLimiting, disableWrites],
}).then(app => {
	app.listen(PORT, () => {
		app.logger(`Listening on ${PORT}`);
	});
});
```
