# Biz Ops Rest API V2 Documentation

The following provides details of the available endpoints. You must use the correct prefix for the url.
When calling through API gateway use the folowing:

| environment | prefix value                 |
| ----------- | ---------------------------- |
| test        | https://api-t.ft.com/biz-ops |
| prod        | https://api.ft.com/biz-ops   |

Example:
https://api-t.ft.com/biz-ops/v2/node/Group/groupid?upsert=true&relationshipAction=merge

## Table of Contents

-   [Node](#Node)
    -   [Payload structure](#Payload-structure)
        -   [Deleting while patching](#Deleting-while-patching)
        -   [Example payload](#Example-payload)
    -   [Error structure](#Error-structure)
    -   [GET](#GET)
    -   [POST](#POST)
    -   [PUT](#PUT)
    -   [PATCH](#PATCH)
    -   [DELETE](#DELETE)
    -   [Field locking](#Field-locking)
-   [Merge](#Merge)
    -   [POST](#POST-1)

## Node

```
{prefix}/v2/node/:nodeType/:code
```

### Url parameters

_These are case-insensitive and will be converted internally to the casing used in the underlying database_

| parameter | description                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------- |
| type      | The type of record to act upon. A capitalised string using the characters a-z e.g. `System`, `Person` |
| code      | The code identifier of the record, e.g. the system code `dewey-runbooks`                              |

### Payload structure

All requests that return or expect a body respond with/accept a JSON of properties as defined in the [schema for the type being acted upon](https://github.com/Financial-Times/biz-ops-schema/tree/master/schema/types). Properties are listed in the `properties` section of the yaml file for each type. A few points to bear in mind:

-   The types listed against each property in the schema may not be primitives, but instead hints (aimed at consumers of the data) for what sort of data the field contains. To find the correct type of primitive to send, [look it up here](https://github.com/Financial-Times/biz-ops-schema/blob/master/lib/primitive-types-map.js)
-   Many properties define relationships to other records, so changes you make to a single record will typically have an effect on the relationships of other records. The behaviour _is_ deterministic, but your API calls may nevertheless have effects you did not expect. Ask in the [#biz ops slack channel](https://biz-ops.in.ft.com/financialtimes.slack.com/messages/C9S0V2KPV) if you have any questions
-   The payload structure is inspired by the [biz-ops graphql api](http://biz-ops.api.ft.com/graphiql). The principle differences are:
    -   It only supports querying to a depth of "1.5" i.e. properties of the root node, and relationships to directly connected records
    -   In graphql related nodes are returned as objects with a `code` property, whereas the rest api payload dispenses with the containing object i.e. `relatedThing: "my-code"` and `relatedThings: ["my-code"]`, not `relatedThing: {"code": "my-code"}` and `relatedThings: [{"my-code": "code"}]`
-   You can tell which properties define relationships by checking to see if there is a `relationship` property defined on the property in the schema. This contains the name the relationship is stored as in the underlying neo4j database
-   A relationship property may also define `hasMany: true`. If they do, then it should be passed an array of `code`s of related records. If `hasMany` is `false` or undefined, it will accept either a `code` as a string or an array of length 1 containing a single `code`.
-   Codes cannot be changed using the API. If a `code` in a payload does not match the one in the array, an error will be thrown

#### Deleting while patching

-   Sending a `null` value for any property will delete the relationships or attributes stored against that property
-   To target deleting relationships to specific nodes prefix the relationships name with a `!`, e.g. `!dependencies: ['my-app']` will remove `my-app` as a dependency, while leaving others unchanged

#### Example payload

```json
{
	"code": "system1",
	"name": "My example system",
	"description": "A longer string. There are no hard limits on string lengths",
	"healthchecks": ["healthcheck-id-1", "healthcheck-id-2"],
	"deliveredBy": "my-delivery-team",
	"!dependencies": ["my-app"]
}
```

### Error structure

All errors are returned as json of the following structure:

```json
{
	"errors": [
		{
			"message": "First error message"
		},
		{
			"message": "Second error message"
		}
	]
}
```

Errors are returned in an array to avoid breaking API changes in future, but at present all endpoints only return an errors array of length one.

### GET

_Note, it is not possible to omit `nodeType` and/or `code` to retrieve a list of nodes. `/api/graphql` is intended to be the primary read interface for anything other than single records._

| initial state | status | response type |
| ------------- | ------ | ------------- |
| absent        | 404    | none          |
| existing      | 200    | json          |

### POST

Used to create a new node, optionally with relationships to other nodes.

-   The query string `upsert=true` allows the creation of any new nodes needed to create relationships

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

-   Passing in `null` as the value of any attribute of `node` will delete that attribute
-   The query string `upsert=true` allows the creation of any new nodes needed to create relationships
-   The query string `relationshipAction`, taking the values `merge` or `replace` specifies the behaviour when modifying relationships
    -   `merge` - merges the supplied relationships with those that already exist, with the exception of properties which define n-to-one relationships, where the original value will be replaced
    -   `replace` - for any relationship-defining property in the payload, replaces any existing relationships with those defined in the payload

| body                   | query                               | initial state                              | status | response type |
| ---------------------- | ----------------------------------- | ------------------------------------------ | ------ | ------------- |
| node only              | none                                | absent                                     | 201    | json          |
| node only              | none                                | existing                                   | 200    | json          |
| node and relationships | none                                | anything                                   | 400    | none          |
| node and relationships | `relationshipAction`                | existing primary node, related nodes exist | 200    | json          |
| node and relationships | `relationshipAction`                | existing primary node and related nodes    | 400    | none          |
| node and relationships | `relationshipAction`, `upsert=true` | existing primary node and related nodes    | 200    | json          |

### DELETE

Used to remove a node. _This method should be used sparingly as most types have some property which indicates whether the record is an active one or not_

| initial state                                  | status | response type |
| ---------------------------------------------- | ------ | ------------- |
| absent                                         | 404    | none          |
| existing, with relationships to other nodes    | 409    | none          |
| existing, with no relationships to other nodes | 204    | none          |

### Field locking

When automating writes to Biz Ops API from another system which is a source of truth for some data (e.g. ip-people-api is the source of truth for information about Person records for FT staff), it's desirable to prevent any other system overwriting the values.

For this reason, fields can be locked by clients writing to the Biz Ops API by using the `lockFields` query parameter. Once locked by a given `client-id`, a field/property can only be overwritten by requests using the same `client-id`.

Fields can however be unlocked by any `client-id`, using the `unlockFields` query parameter, but this feature should rarely be used; it is only provided in order to make it possible to correct mistakenly locked fields.

Example: `https://api-t.ft.com/biz-ops/v2/node/Group/groupid?relationshipAction=merge&lockFields=name`;

| query name   | value                               | example                                                                                            | request type   |
| ------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------- | -------------- |
| lockFields   | comma list of field names to lock   | lockFields={name,email}                                                                            | POST and PATCH |
| lockFields   | all                                 | lockFields=all, will lock all fields sent in the request body                                      | POST and PATCH |
| unlockFields | comma list of field names to unlock | unlockFields={name,code}                                                                           | PATCH          |
| unlockFields | all                                 | unlockFields=all, will unlock all previously locked fields, regardless of which client locked them | PATCH          |

-   `clientId` needs to be set in the request otherwise a `LockedFieldsError` will be throw with a 400 status.

        Log events: `SET_LOCKED_FIELDS` and `REMOVE_LOCKED_FIELDS`.

## Merge

```
{prefix}/v2/merge
```

This endpoint allows merging two nodes. All relationships defined on the source node will be copied to the destination node. Any properties defined on the source node but _not_ defined on the destination node will be copied across. Properties defined on both nodes will take the value already set on the destination node. The source node will be deleted

### POST

Send a JSON with the following properties, all required

| parameter name  | type   | description                                                            |
| --------------- | ------ | ---------------------------------------------------------------------- |
| type            | string | The type of the nodes to be merged. Both nodes must have the same type |
| sourceCode      | string | The code of the source node                                            |
| destinationCode | string | The code of the destination node                                       |

Responds with a 200 JSON payload for the destination node matching the standard CRUD response https://github.com/Financial-Times/biz-ops-api/blob/master/ENDPOINTS.md#payload-structure
