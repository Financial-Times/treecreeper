# tc-api-express-logger

A logging utilty that uses async hooks to provide contextual information, uniqiue per request handled, to logs sent from a treecreeper express application.

## API

### `setContext(key, val)`

Sets a value for inclusion in structured logs pretaining to this request. If `key` is an object, adds all the opbject's properties to the context

### `getContext(key)`

Reads a value from the logging context for the c urrent request. If key is absent, returns the entire context object

### `getContextByRequestId(requestId)`

If the requestId for the current request is known, this returns the entire context object for that request.

### `middleware`

Middleware, that should be applied as one of the first pieces of middleware in the application (any logs sent by middlewares added before this one will not have access to the contextual log information for the request)

### `logger`

A logger - based on `@financial-times/n-logger` - implementing all the strandard logging methods
