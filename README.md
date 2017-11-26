# GDPR API

API for the GDPR graph database

## Run

Download and start the [neo4j community edition](https://neo4j.com/download/) database.

```
export GRAPHENEDB_BOLT_URL=bolt://localhost:7687
```

Populate it,

```
node scripts/init.js
```

Run the server,

```
node server/app
```