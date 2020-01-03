# tc-api-db-manager

This package is responsible for

-   maintaining indexes on the neo4j database
-   providing a preconfigured & instrumented copy of neo4j driver

## Configuration

tc-api-db-manager expects 3 environment variables:

-   `NEO4J_BOLT_URL` - the url (including the PORT) to make BOLT requests to neo4j on
-   `NEO4J_BOLT_USER` - the user to use for signing into the database
-   `NEO4J_BOLT_PASSWORD` - the password to use for signing into the database

## API

**tc-api-db-manager is a singleton. tc-api-express takes care of initialising, and tc-api-rest-handlers takes care of reading and writing data, so the API should not, in general, be used directly. It is documented here for completeness, and to aid in the development of other wrappers for the packages e.g. to support building an API for AWS lambda**

### `initConstraints()`

This initialises constraints on the neo4j database based on the treecreeper schema provided to the application

### `listenToChanges()`

This runs `initConstraints()` whenever `tc-schema-sdk` fires a `change` event

### `setTimeout(timeout)`

Sets the timeout - in ms - for database queries

### `driver`

A reference to the underlying neo4j driver instance

### `executeQuery(query, parameters)

Executes a query, using the given parameters, against the neo4j database.

### `executeQueryWithSharedSession([session])

Returns a function with the same signature as `executeQuery`, but each call to it will share a single database session. If no `session` is provided, one will be created.

The function also has a property `close()`, whic h can be called to finally close the session once all queries are executed

### executeQueriesWithTransaction({query, parameteres}, {query, parameteres}, ...)

Executes one or more query + parameters pairs within a single, ATOMic neo4j transaction
