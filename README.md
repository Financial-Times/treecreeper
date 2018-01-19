# Business Operations API

WIP

## Architecture

https://github.com/Financial-Times/gdpr

WIP

## Run

WIP

Download and start the [neo4j community edition](https://neo4j.com/download/) database.

```
export GRAPHENEDB_CHARCOAL_BOLT_URL=bolt://localhost:7687
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
