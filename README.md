# Business Operations API

WIP

## Architecture

https://github.com/Financial-Times/gdpr

WIP

## Endpoints

[Endpoint](ENDPOINTS.md) Reference

## Cookbook

Sample [queries/output](COOKBOOK.md)


## Run

Start the [neo4j](https://neo4j.com/) community edition database. This requires the [APOC procedures](http://github.com/neo4j-contrib/neo4j-apoc-procedures) library to be added to a `plugins` directory:

```shell
./scripts/neo4j-plugins
docker compose up
```

Populate it,

```
node scripts/init.js
```

Run the server,

```
node server/app
```

If the have [vault cli](https://github.com/Financial-Times/vault/wiki/Getting-Started#login-with-the-cli) setup and [jq](https://stedolan.github.io/jq/) installed, run the below to get environment details from vault:

```sh
$ npm run vault:env
```
