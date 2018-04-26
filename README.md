# Business Operations API

WIP

## Architecture

[Architectural Diagrams](https://github.com/Financial-Times/gdpr).

WIP

## Access

The API endpoints for the biz-ops API are available behind [FT API Gateway](http://developer.ft.com/).

The public API URLs are:

| Environment   | Url                                |
| ------------- | --------------------------------   |
| Production    | `https://api.ft.com/biz-ops/api`   |
| Test          | `https://api-t.ft.com/biz-ops/api` |

To get access you will need to acquire an API key.
To get one, either:

*   use the [API gateway slack bot](https://github.com/Financial-Times/apig-api-key-warden) for the relevant environment
*   fill in a request form to the [API gateway slack team](https://financialtimes.slack.com/messages/C06GDS7UJ).

The API key can then be passed on each request either as a query parameter, e.g.

```shell
curl https://api.ft.com/biz-ops/api/__gtg?apiKey=...
```

or as an `X-Api-Key` header, e.g.

```shell
curl -H "X-Api-Key: ..." https://api.ft.com/biz-ops/api/__gtg
```

## Endpoints

[Endpoint](ENDPOINTS.md) Reference

## Cookbook

Sample [queries/output](COOKBOOK.md)

## Run

Install dependencies:

```shell
npm install
```

Start the [neo4j](https://neo4j.com/) community edition database. This requires the [APOC procedures](http://github.com/neo4j-contrib/neo4j-apoc-procedures) library to be added to a `plugins` directory:

```shell
./scripts/neo4j-plugins
docker compose up
```

This can be done _without_ docker if desired, by instead installing a neo4j database instance to the `neo4j` directory, the directory structure and scripts to run are the same as the docker configuration.

Setup [vault CLI](https://github.com/Financial-Times/vault/wiki/Getting-Started#login-with-the-cli). This allows you to populate environment variables, including secrets, from vault by running the following:

```shell
npm run vault:env
```

Populate the database:

```shell
npm run init-db
```

Run the server:

```shell
npm start
```

Run tests locally:

```shell
npm run test-dev
```
