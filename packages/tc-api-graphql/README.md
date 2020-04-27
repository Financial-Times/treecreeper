# @financial-times/tc-api-graphql

Treecreeper&tm; graphql express middleware to sit in front of a neo4j database instance

It exports `{getGraphqlApi}`. `getGraphqlApi` accepts the following configuration object (defaults are as specified below):

## API

### `getGraphqlApi(options)`

Sets up a GraphQL api which (if `tc-schema-sdk` is configured to update on demand) hot reloads the GraphQL schema to match changes to the underlying treecreeper schema. It returns an object with 3 properties

```js
{
  graphqlHandler, // express middleware that implements the GraphQL API
  isSchemaUpdating, // a function that returns a boolean indicating whether the application is successfully keeping the schema that defines its data types up to date
  listenForSchemaChanges, // a function that, when called, starts the api polling for changes to a treecreeper schema published to some url
};
```

#### Options

##### `documentStore`

An [optional] reference to a tc-api-s3-document-store instance (or a library implementing the same API), used to store large properties outside the neo4j instance

##### `republishSchema`

A boolean indicating whether the application needs to republish the schema to somewhere once it has updated the graphqlApi. Note that republishing depends on a `TREECREEPER_SCHEMA_BUCKET` environment variable, which should be the name of an s3 bucket.

##### `republishSchemaPrefix = 'api'`

If the application needs to republish the schema to somewhere once it has updated the graphqlApi, this string indicates the
prefix to use

#### `typeDefs`

An [optional] array value for extending the existing type definitions

```
{
  typeDefs: [
    `type ExtendedType {
      code: String
      someString: String
      someFloat: Float
      someEnum: AnEnum
    }`,
    `extend type MainType {
      extended: ExtendedType @neo4j_ignore *
    }`,
  ],
}
```

_\* **@neo4j_ignore** must be added so that it is not used during the schema augmentation process_

#### `resolvers`

An [optional] object value for adding extra/custom resolvers

```
{
  resolvers: {
    MainType: {
      extended: () => { ...custom resolver },
    },
  },
}
```

#### `excludeTypes`
An [optional] array of type names to exclude from neo4j-graphql-js augmentation. This should list all types which get data from sources other than the neo4j

## Example

```js
const express = require('express');
const { getGraphqlApi } = require('@financial-times/tc-api-graphql');

const app = express();
const { graphqlHandler, listenForSchemaChanges } = getGraphqlApi();

listenForSchemaChanges();
app.use('/graphql', graphqlHandler);

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
	console.log(`Listening on ${PORT}`);
});
```
