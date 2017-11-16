# GDPR API

API for the GDPR graph database

## Run

Download and start the [neo4j community edition](https://neo4j.com/download/) database.

```
export NEO_URI=bolt://localhost; export NEO_USER=neo4j; export NEO_PASSWORD=neo4j
```

Populate it,

```
node scripts/init.js
```

Run the server,

```
node server/app
```

