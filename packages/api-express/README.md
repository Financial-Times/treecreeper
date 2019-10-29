# @treecreeper/api-rest-express

This returns a treecreeper&tm; api to sit in front of a neo4j database instance i.e.

-   a graphql api
-   RESTful CRUD endpoints

It accepts the following configuration object (defaults are as specified below):

```js
{
	(app = express()), // an express app. If none provided, one will be created
		(treecreeperPath = '/'), // the path at which the treecreeper api is served
		(graphqlPath = '/graphql'), // the path, relative to treecreeperPath, where the graphql api is served
		(graphqlMethods = ['post']), // methods accepted by the graphql api
		(graphqlMiddlewares = []), // array of middlewares to call before the graphql handler executes
		(restPath = '/rest'), // the path, relative to treecreeperPath, where the REST api is served
		(restMiddlewares = []), // array of middlewares to call before the relevant REST handler executes
		documentStore, // an [optional] reference to a documentStore object, used to store large properties outside the neo4j instance
		logger; // an [optional] logger that implements debug, info, warning and error methods
}
```

It returns either express application provided, or the new one it creates. Attached to this app is a `treecreeper` object with the following properties:

```js
app.treecreeper = {
	logger, // the logger passed into the app, or a reference to trteecreeper's internal logger, which decoprates each log with useful application/request metadata
	isSchemaUpdating, // a function that returns a boolean indicating whether the application is successfully keeping the schema that defines it data types up to date
};
```

## Example

```js
const { getApp } = require('@treecreeper/api-rest-express');
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
