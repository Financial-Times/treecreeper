# Treecreeper

Sandbox for working on the set of tools and services that make up the Biz Ops ecosystem at the FT

-   neo4j database
-   graphql api
-   rest api
-   ui components

This _may_ become a monorepo for deploying a suite of packages for reuse by Biz Ops and other projects

## Run

### Prerequisities

-   nodejs 8
-   [vault CLI](https://github.com/Financial-Times/vault/wiki/Getting-Started#login-with-the-cli)
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

Note: The database will always need to run in a separate process/terminal to the node application

# Running the application

```shell
make env run
```

This will download credentials, save them to an `.env` file, and start the node process on prt 8888. The endpoints are as documented for the production application, except that paths are not prefixed with `/biz-ops`. Copy the `API_KEY` from `.env` into a `API_KEY` header when sending requests. Note: this is not the same as the `X-API-KEY` used to authenticate with api-t.ft.com

# Testing

```shell
make test
```

Will start jest in watch mode

# Accessing the application from other local applications

The application runs on `http://loclhost:8888`. There are 2 differences in how the api is called compared to production environments:

-   the client will need to send an `API_KEY` header (not `x-api-key`). A value for this can be found in the `.env` file of this project after running `make .env`
-   all example urls in the documentation should have the `/biz-ops` stripped out
