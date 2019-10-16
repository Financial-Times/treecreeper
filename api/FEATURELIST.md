# Features
Aside from CRUD actions and existence of graphql API

# TODO
 - move db-connectiom into api-db-manager


## App level
- Sets constraints on database when schema changes
- Initialises next-metrics
- __gtg endpoint
- __health endpoint
- Initialises context middleware
- Initialises requestId middleware
- turns on case-sensitive routing (disable this and have schema not allow 2 types to differ only in casing? Yes :-) 
- sets s3o-cookie-ttl
- graphiql endpoint
- error to errors middleware (duplicates the rest one because errors don't propagate to middleware outsid of routes, or something like that)
- notFound middleware
- final catch middleware
- Global TIMEOUT constant

## Graphql
- maintenance mode middleware
- security middleware (s3o or api key)
- optional clientId middleware (because s3o??)
- body parsing (json or urlencoded)
- timeout
- setContext and next metrics namespace
- Access log

## REST
- maintenance mode middleware
- security middleware (api key)
- clientId middleware
- body parsing (json or urlencoded)
- timeout
- setContext and next metrics namespace
- Access log
- error to errors middleware
- kinesis event
- For system creation, create salesforce record
