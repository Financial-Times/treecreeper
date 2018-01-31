# Business Operations API

WIP

## Architecture

https://github.com/Financial-Times/gdpr

WIP

## Cookbook

Sample [queries/output](cookbook.md)

### Name of system's product owner
```
MATCH (s:System)-[:productOwner]->(c:Contact) where s.id='upp-mccm' RETURN c.name
```

### List of systems product owned by an individual
```
MATCH (s:System)-[:productOwner]->(c:Contact) where c.id='geoffthorpe' RETURN s
```

### Remove unwanted legacy attribute (due to it being replaced by relationship)
```
MATCH (s:System) remove s.productOwnerName RETURN s.id
```

### Count presence of data in important fields/legacy fields
```
MATCH (s:System) RETURN count(*) as systems, count(s.name) as names, count(s.serviceTier) as tiers, count(s.description) as descs
MATCH (s:System) RETURN count(*), count(s.name), count(s.status), count(s.author)
```

### Count presence of system contacts
```
RETURN count(*) as systems,
       size((s)-[:programme]->(:Contact)) as programme,
       size((s)-[:productOwner]->(:Contact)) as productOwners,
       size((s)-[:technicalLead]->(:Contact)) as technicalLeads,
       size((s)-[:primaryContact]->(:Contact)) as primary,
       size((s)-[:secondaryContact]->(:Contact)) as secondary
```

### Count nuber of missing critical attributes
```
MATCH (s:System) RETURN count(*) as systems, count(*)-count(s.name) as missing_names, count(*)-count(s.serviceTier) as missing_tiers, count(*)-count(s.description) as missing_descriptions
```

## Run

WIP

Download and start the [neo4j community edition](https://neo4j.com/download/) database.


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
