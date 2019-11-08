# @financial-times/treecreeper-api-graphql

Treecreeper&tm; graphql express middleware to sit in front of a neo4j database instance

It exports `{getGraphqlApi}`. `getGraphqlApi` accepts the following configuration object (defaults are as specified below):

```js
getApp({
	documentStore, // an [optional] reference to a documentStore object, used to store large properties outside the neo4j instance
	republishSchema, // a boolean indicating whether the application needs to republish the schema to somewhere once it has updated the graphqlApi
	logger, // an [optional] logger that implements debug, info, warning and error methods
});
```

It returns either express application provided, or the new one it creates. Attached to this app is a `treecreeper` object with the following properties:

```js
{
  graphqlHandler, // a function implementing the express/connect middleware interface
  isSchemaUpdating, // a function that returns a boolean indicating whether the application is successfully keeping the schema that defines it data types up to date
  listenForSchemaChanges, // a function that, when called, starts teh api polling for changes to a treecreeper schema published to some url
};
```

## Example

```js
const express = require('express');
const { getGraphqlApi } = require('@financial-times/treecreeper/api-graphql');

const app = express();
const { graphqlHandler, listenForSchemaChanges } = getGraphqlApi();

listenForSchemaChanges();
app.use('/graphql', graphqlHandler);

const PORT = process.env.PORT || 8888;

app.listen(PORT, () => {
	console.log(`Listening on ${PORT}`);
});
```
