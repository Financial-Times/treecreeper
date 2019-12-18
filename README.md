# Treecreeper

Sandbox for working on the set of tools and services that make up the Biz Ops ecosystem at the FT

-   neo4j database
-   graphql api
-   rest api
-   ui components

## Run

### Prerequisities

-   nodejs 8
-   member of reliability-engineering github team
-   [docker](https://www.docker.com/get-docker)

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

# Running the application

```shell
make run
```

This will start the demo node process on port 8888. See `/demo/app.js` for details of the urls served

# Testing

```shell
make test
```

Will start jest in watch mode
