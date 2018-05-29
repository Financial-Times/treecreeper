# Biz Ops API Documentation

## /v1/node/:nodeType/:code

### Url parameters

_These are case-insensitive and will be converted internally to the casing used in the underlying database_

| parameter | description                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------- |
| nodeType  | The type of node to return. A capitalised string using the characters a-z e.g. `System`, `Person` |
| code      | The identifier of the node. A hyphen delimited string e.g. the system code `dewey-runbooks`       |

### Payload structure

All requests that return or expect a body respond with/accept a json of the following structure:

```json
{
  // map of attributes to assign to the primary node
  // passed in directly to neo4j and accepts any data types compatible with it
  // see https://neo4j.com/docs/developer-manual/current/cypher/syntax/values/
  // Optional when using PATCH
  "node": {
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
* The query string `relationshipAction`, taking the values `replace` or `append` specifies the behaviour when modifying relationships
  * `replace` - replaces any relationships of the same relationship type as those passed in the request body
  * `append` - appends the specified relationships to those that already exist

| body                   | query                               | initial state                              | status | response type |
| ---------------------- | ----------------------------------- | ------------------------------------------ | ------ | ------------- |
| node only              | none                                | absent                                     | 201    | json          |
| node only              | none                                | existing                                   | 200    | json          |
| node and relationships | none                                | anything                                   | 400    | none          |
| node and relationships | `relationshipAction`                | existing primary node, related nodes exist | 200    | json          |
| node and relationships | `relationshipAction`                | existing primary node and related nodes    | 400    | none          |
| node and relationships | `relationshipAction`, `upsert=true` | existing primary node and related nodes    | 200    | json          |

### DELETE

Used to remove a node. Note, this will not remove the entry from the database, but will flag it as `isDeleted`. _This method should be used sparingly_

| initial state                                  | status | response type |
| ---------------------------------------------- | ------ | ------------- |
| absent                                         | 404    | none          |
| existing, with relationships to other nodes    | 409    | none          |
| existing, with no relationships to other nodes | 204    | none          |
