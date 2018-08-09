# Biz Ops API Documentation

The following provides details of the available endpoints. You must use the correct prefix for the url.
When calling through API gateway use the folowing:

| environment | prefix value                 |
| ----------- | -----------------------------|
|   test      | https://api-t.ft.com/biz-ops |
|   prod      | https://api.ft.com/biz-ops   |

Example:
https://api-t.ft.com/biz-ops/v1/node/Group/[groupid]?upsert=true&relationshipAction=merge

## Node - {prefix}/v1/node/:nodeType/:code

### Url parameters

_These are case-insensitive and will be converted internally to the casing used in the underlying database_

| parameter | description                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------- |
| nodeType  | The type of node to return. A capitalised string using the characters a-z e.g. `System`, `Person` |
| code      | The identifier of the node. A hyphen delimited string e.g. the system code `dewey-runbooks`       |

### Payload structure

All requests that return or expect a body respond with/accept a JSON of the following structure:

```json5
{
  // map of attributes to assign to the primary node
  // passed in directly to neo4j and accepts any data types compatible with it
  // see https://neo4j.com/docs/developer-manual/current/cypher/syntax/values/
  // Optional when using PATCH
  "node": {
    // property names must be camelCase
    "property": "value"
  },
  // Optional map of one or more relationship definitions
  "relationships": {
    // name must be a _ delimited uppercase string
    "RELATIONSHIP_NAME": [{
      "direction": "outgoing" // or "incoming", denoting the direction of the relationship
      "nodeType": "System" // The valid node type of the other end of the relationship
      "nodeCode": "system-code" // The valid node code of the other end of the relationship
    }]
  }
}
```

### GET

_Note, it is not possible to omit `nodeType` and/or `code` to retrieve a list of nodes. `/api/graphql` is intended to be the primary read interface for anything other than single records._

| initial state | status | response type |
| ------------- | ------ | ------------- |
| absent        | 404    | none          |
| existing      | 200    | json          |

### POST

Used to create a new node, optionally with relationships to other nodes.

* The query string `upsert=true` allows the creation of any new nodes needed to create relationships

| body                   | query         | initial state                            | status | response type |
| ---------------------- | ------------- | ---------------------------------------- | ------ | ------------- |
| node only              | none          | absent                                   | 200    | json          |
| node only              | none          | existing                                 | 409    | none          |
| node and relationships | none          | absent primary node, related nodes exist | 200    | json          |
| node and relationships | none          | absent primary node and related nodes    | 400    | none          |
| node and relationships | `upsert=true` | absent primary node and related nodes    | 200    | json          |

### PUT

Not implemented. Use `PATCH`

### PATCH

Used to modify or create a node, optionally with relationships to other nodes.

* Passing in `null` as the value of any attribute of `node` will delete that attribute
* The query string `upsert=true` allows the creation of any new nodes needed to create relationships
* The query string `relationshipAction=merge`, allows existing values to be overwritten with new data

| body                   | query                                     | initial state                              | status | response type |
| ---------------------- | ----------------------------------------- | ------------------------------------------ | ------ | ------------- |
| node only              | none                                      | absent                                     | 201    | json          |
| node only              | none                                      | existing                                   | 200    | json          |
| node and relationships | none                                      | anything                                   | 400    | none          |
| node and relationships | `relationshipAction=merge`                | existing primary node, related nodes exist | 200    | json          |
| node and relationships | `relationshipAction=merge`                | existing primary node and related nodes    | 400    | none          |
| node and relationships | `relationshipAction=merge`, `upsert=true` | existing primary node and related nodes    | 200    | json          |

### DELETE

Used to remove a node. _This method should be used sparingly_

| initial state                                  | status | response type |
| ---------------------------------------------- | ------ | ------------- |
| absent                                         | 404    | none          |
| existing, with relationships to other nodes    | 409    | none          |
| existing, with no relationships to other nodes | 204    | none          |

## Relationship - {prefix}/v1/node/:nodeType/:code/:relationshipType/:relatedType/:relatedCode

### Url parameters

_These are case-insensitive and will be converted internally to the casing used in the underlying database_

| parameter        | description                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| nodeType         | The type of node to return. A capitalised string using the characters a-z e.g. `System`, `Person` |
| code             | The identifier of the node. A hyphen delimited string e.g. the system code `dewey-runbooks`       |
| relationshipType | The type of relationship between the nodes. A `_` delimited uppercase string e.g. `HAS_TECH_LEAD` |
| relatedType      | The type of node to return. A capitalised string using the characters a-z e.g. `System`, `Person` |
| relatedCode      | The identifier of the node. A hyphen delimited string e.g. the system code `dewey-runbooks`       |  |

### Payload structure

All requests that return or expect a body respond with/accept a JSON of attributes, one level deep. These can use any [data types compatible with neo4j](https://neo4j.com/docs/developer-manual/current/cypher/syntax/values/). Property names must be camelCase.

### GET

_Note, it is not possible to omit any url parameters to retrieve a list of relationships. `/api/graphql` is intended to be the primary read interface for anything other than single records._

| initial state                    | status | response type |
| -------------------------------- | ------ | ------------- |
| absent end nodes or relationship | 404    | none          |
| existing                         | 200    | json          |

### POST

Used to create a new relationship between two existing nodes. Optionally send a JSON of attributes to add to the relationship in the request body.

| initial state       | status | response type |
| ------------------- | ------ | ------------- |
| absent end node     | 400    | none          |
| absent relationship | 200    | json          |
| existing            | 409    | none          |

### PUT

Not implemented. Use `PATCH`

### PATCH

Used to create or modify a relatiosnhip between two existing nodes. Optionally send a JSON of attributes to add to the relationship in teh request body. Passing in `null` as the value of any attribute will delete that attribute

| initial state       | status | response type |
| ------------------- | ------ | ------------- |
| absent end node     | 400    | none          |
| absent relationship | 201    | json          |
| existing            | 200    | json          |

### DELETE

Used to remove a relationship.

| initial state | status | response type |
| ------------- | ------ | ------------- |
| absent        | 404    | none          |
| existing      | 204    | none          |
