# @financial-times/tc-api-rest-express

Treecreeper&tm; api to sit in front of a neo4j database instance. It provides

-   a graphql api
-   RESTful CRUD endpoints
-   Takes care of initialising a schema-sdk and api-db-manager, so that data structures automatically update

It exports `{ getApp }`. `getApp` accepts the following configuration object (defaults are as specified below):

```js
getApp({
	app = express(), // an express app. If none provided, one will be created
	treecreeperPath = '/', // the path at which the treecreeper api is served
	graphqlPath = '/graphql', // the path, relative to treecreeperPath, where the graphql api is served
	graphqlMethods = ['post'], // methods accepted by the graphql api
	graphqlMiddlewares = [], // array of middlewares to call before the graphql handler executes
	restPath = '/rest', // the path, relative to treecreeperPath, where the REST api is served
	restMiddlewares = [], // array of middlewares to call before the relevant REST handler executes
	documentStore, // an [optional] reference to a documentStore object, used to store large properties outside the neo4j instance
	republishSchema, // a boolean indicating whether the application needs to republish the schema to somewhere once it has updated the graphqlApi
	republishSchemaPrefix = 'api', // If the application needs to republish the schema to somewhere once it has updated the graphqlApi, this string indicaytes the prefix to use
	logger, // an [optional] logger that implements debug, info, warning and error methods
	timeout // optional integer to set maximum time DB will be queried for adn, by association, maximum time a request can stay alive for before being rejected and erroring
})
```

It returns an object with the following structure

```js
app.treecreeper = {
	logger, // a reference to treecreeper's internal logger, which decorates each log with useful application/request metadata
	isSchemaUpdating, // a function that returns a boolean indicating whether the application is successfully keeping the schema that defines its data types up to date
};
```

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
