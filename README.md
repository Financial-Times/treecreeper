# Business Operations API

Modelling our business' operations
![image](https://user-images.githubusercontent.com/447559/51336971-dba88780-1a7d-11e9-9f6b-e867440c3985.png)

## Access

### API

The REST API endpoints for the biz-ops API are available behind [FT API Gateway](http://developer.ft.com/). See the [API documentation](https://github.com/Financial-Times/biz-ops-api/blob/master/ENDPOINTS.md) for details of available endpoints and methods.

The public API URLs are:

| Environment | Url                            |
| ----------- | ------------------------------ |
| Production  | `https://api.ft.com/biz-ops`   |
| Test        | `https://api-t.ft.com/biz-ops` |

To get access you will need to acquire an API key.
To get one, either:

-   use the [API gateway slack bot](https://github.com/Financial-Times/apig-api-key-warden) for the relevant environment
-   fill in a request form to the [API gateway slack team](https://financialtimes.slack.com/messages/C06GDS7UJ).

The API key can then be passed on each request either as a query parameter, e.g.

```shell
curl https://api.ft.com/biz-ops/__gtg?apiKey=...
```

or as an `X-Api-Key` header, e.g.

```shell
curl -H "X-Api-Key: ..." https://api.ft.com/biz-ops/__gtg
```

You will also need to set a `client-id` header, with the system code of the system calling the api (or some other identifier if not a recognised system).

Passing a request id using the `x-request-id` header is also recommended for auditing purposes.

### GraphQL

The API exposes a [GraphQL](https://graphql.org/) API, which allows querying the underlying graph nodes and relationships in a single request. The read api is available by GET/POST queries to the path `/biz-ops/graphql`. At present, there is no write api for graphql.

| Environment | Url                                    |
| ----------- | -------------------------------------- |
| Production  | `https://api.ft.com/biz-ops/graphql`   |
| Test        | `https://api-t.ft.com/biz-ops/graphql` |

You will still require `X-API-KEY`(dev/test or production) and `client-id` headers for these requests.

Read about these requests in the [GraphQL docs](https://graphql.org/learn/serving-over-http/#http-methods-headers-and-body)

#### Should you use GET or POST?

GET requests are not cached yet, but eventually the aim is to cache in Fastly for short periods of time. So:

-   Use GET if you want performance and resilience, and being up-to-the-millisecond acuurate is not important
-   Use POST when recency of data is most important. In particular if reading data to analyse before PATCHing it with new data, _always_ use POST

#### GET Example

To read via a GET, you must specify your graphql query as query-parameter in the request. For example:

-   Endpoint: `https://api-t.ft.com/biz-ops/graphql?query={Teams{code name}}`

Will fetch all `Teams` with their relevant `code` and `name`.

#### POST Example

To read via a POST, you must specify your query as JSON in the `Body` of the request. For example:

-   Endpoint: `https://api-t.ft.com/biz-ops/graphql`

-   Body: `{"query": "{Teams { code name }}"}`

### GraphiQL

To complement graphql, the api exposes the [graphiql](https://github.com/graphql/graphiql) IDE, which supports autocomplete and is the recommended way to explore the underlying data.

This should be accessed directly as it is a UI, not through the above API gateway endpoints. Access is authenticated via s3o.

| Environment | Url                                           |
| ----------- | --------------------------------------------- |
| Production  | `https://biz-ops.api.ft.com/graphiql`         |
| Test        | `https://biz-ops-staging.api.ft.com/graphiql` |

## API endpoints

Please use V2 as V1 has now been deprecated

-   [V2 API Reference](ENDPOINTS.md)

## Cookbook

Sample [queries/output](COOKBOOK.md)

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

## Update AWS CloudFormation template

To deploy an update to the AWS CloudFormation template for the kinesis update stream, make your changes and run

```
make deploy-aws
```

## Load Testing

### API Key

The load tests are currently setup to run against the staging ENV and that's the API key required. Please note that you do not need to generate this API key. The LOAD_TEST_API_KEY will be the same as the API_KEY value you pulled down from Vault.

If you have not yet retrieved the environment variables from Vault,[please visit the Vault Setup section](#vault-setup).

### Setup for Load Testing

First, you will need to run:

```shell
 LOAD_TEST_API_KEY=<INSERT_API_KEY> npm run test:load:generateData
```

This will generate the random data that you will need to run your performance tests.

### Running Load Tests

There are 4 different types of load test that can be run - use one of the following commands:

```shell
LOAD_TEST_API_KEY=<INSERT_API_KEY> npm run test:load:readQueries
```

```shell
 LOAD_TEST_API_KEY=<INSERT_API_KEY> npm run test:load:writeQueriesForSystems
```

```shell
 LOAD_TEST_API_KEY=<INSERT_API_KEY> npm run test:load:writeQueriesForGroups
```

```shell
 LOAD_TEST_API_KEY=<INSERT_API_KEY> npm run test:load:writeQueriesForTeams
```

There will be 3 phases to complete for each test:

-   Warm up - this is the arrival rate of 10 virtual users/second that last for 60 seconds.
-   Ramp up - this is where we go from 10 to 25 new virtual user arrivals over 120 seconds.
-   Cruise - this is the arrival rate of 10 virtual users/second that lasts for 1200 seconds.

Once the performance test has completed, the metrics will be sent to the [Grafana Dashboard](http://grafana.ft.com/d/c5B9CEOik/biz-ops-api-load-tests). The config for the grafana setup can be found in scripts/load-testing/lib/statsd/docker-compose.yaml file.

After completing the performance test for write scripts, all the dummy data created in the database will be deleted as part of the command you ran above. However, if this fails and you would like to run the cleanUp script separate from the performance test, you can run the following:

To do this, run the following:

```shell
 LOAD_TEST_API_KEY=<INSERT_API_KEY> npm run test:load:cleanUp
```
