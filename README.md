<img align="right" src=https://user-images.githubusercontent.com/447559/71667873-c7c56680-2d5e-11ea-9e44-a0947997e18c.png />

# Treecreeper

Treecreeper is a set of modular nodejs libraries for managing Graph data. It is built on top of neo4j and uses libraries and many ideas developed for [GRANDstack](https://grandstack.io). From the end user's point of view it provides:

-   A GraphQL API for reading connected data
-   A RESTful API for writing connected data
-   A CMS style user interface for managing the data

From the developer's point of view, it provides a number of packages that can be composed to provide the features listed above:

-   A [specification for a yaml schema](/docs/schema-spec.md) which is used to power the rest of treecreeper
-   [tc-schema-validator](/packages/tc-schema-validator/README.md) - A schema validator for ensuring the schema provided to the treecreeper application(s) by the developer is valid
-   [tc-schema-publisher](/packages/tc-schema-publisher/README.md) - A schema publisher to enable 'Hot reloading' of the schema by the treecreeper application(s)
-   [tc-schema-sdk](/packages/tc-schema-sdk/README.md) - An SDK for consuming the schema, allowing applications to build user interfaces
-   [tc-api-db-manager](/packages/tc-api-db-manager/README.md) - A database manager for ensuring the underlying neo4j database is indexed appropriately
-   [tc-api-graphql](/packages/tc-api-graphql/README.md) - A GraphQL API implementation
-   [tc-api-rest-handlers](/packages/tc-api-rest-handlers/README.md) - A set of REST handlers that enable editing of the data, and which broadcast events when data changes
-   [tc-api-express](/packages/tc-api-express/README.md) - An express wrapper around the database manager, GraphQL and REST handlers
-   [tc-api-s3-document-store](/packages/tc-api-s3-document-store/README.md) - An optional document store utilty, which allows storing large pieces of data in S3 instead of neo4j (which does not handle large files very well). The interface provided by this store is documented, and developers may want to write alternatives that store documents in other locations
-   [tc-ui](/packages/tc-ui/README.md) - A user interface that allows editing and viewing data. this also exports React components and some other tools to allow building custom user interfaces
-   [tc-markdown-parser](/packages/tc-markdown-parser/README.md) - A tool for parsing structured markdown content into a payload for the REST API

## Concepts

-   [Schema and graph data](/docs/schema-and-graph-data.md)
-   [Architecture](/docs/architecture.md)
-   [Schema authoring quickstart](/docs/schema-authoring-quickstart.md)
-   [Schema specification](/docs/schema-spec.md)
-   [GraphQL](/docs/treecreeper-graphql.md)

## Examples

TODO. In the meantime, see /demo directory in this repository for inspiration

-   Express API
-   Express UI
-   Markdown ingester

## Development

### Prerequisities

-   nodejs 8
-   [docker](https://www.docker.com/get-docker)

### Set up

Install dependencies:

```shell
make install
```

Start the [neo4j](https://neo4j.com/) community edition database. This requires the [APOC procedures](http://github.com/neo4j-contrib/neo4j-apoc-procedures) library to be added to a `plugins` directory:

```shell
./scripts/neo4j-plugins
make run-db
```

_Troubleshooting_

-   You may need to install `wget` in order to run `./scripts/neo4j-plugins`. You can do this with `brew` by running `brew install wget`
-   If `wget` fails, visit https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases, download version `3.5.0.1` and save in `./neo4j/plugins`
-   The `make run-db` command requires you to have an account with docker, (you should be able to do that [here](https://hub.docker.com/)) and download the the docker application (you should be able to do that [here](https://www.docker.com/get-docker))).

This can be done _without_ docker if desired, by instead installing a neo4j database instance to the `neo4j` directory, the directory structure and scripts to run are the same as the docker configuration.

### Running the demo application

```shell
make run
```

This will start the demo node process on port 8888. See `/demo/app.js` for details of the urls served

### Testing

```shell
make test
```

Will start jest in watch mode

To run tests for a single package use an environment variable: `pkg=tc-schema-sdk make test`

For many tests to execute successfully you will also need to run `make run-db` in a separate terminal

## Etymology

A treecreeper is a small, woodland bird which climbs up tree trunks in search of invertebrates to eat.

A tree is a type of Graph (the only type of graph that GraphQL can represent well)

It seems apt to name this project after a creature that climbs around in trees.
