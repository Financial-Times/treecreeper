# @treecreeper/api-rest-handlers

Treecreeper&tm; functions for handling CRUD actions via a RESTful interface.

The functions do not implement any handling of requests and responses, but work on a more event driven model - receiving and returning objects - for ease of reuse in various environments. Therefore the RESTful url scheme is implied rather than implemented. This design is both to improve testability and to make it possible, in future, to deploy treecreeper to event driven architectures such as AWS Lambda.

It exports the following functions

```
{
    headHandler,
    getHandler,
    deleteHandler,
    postHandler,
    patchHandler,
    absorbHandler,
}
```

All of these functions are factories that return the actual handlers. Each of the factories accepts the following options

```
{
    documentStore, // [optional] reference to a documentStore object, used to store large properties outside the neo4j instance
    logger, // [optional] logger that implements debug, info, warning and error methods
}
```

## URL scheme

Although not implemented, the handlers are intended to be used to handle RESTful urls similar to the following:

-   `/:type/:code` - all handlers apart from absorb
-   `/:type/:code/absorb/:absorbedCode` - absorb

## Input

With the exception of `absorbHandler` they all return handlers which accept the following input:

```
{
    type, // the type of record to interact with
    code, // the unique code of the record to interact with. This is the record's id, but for historical reasons it is called `code`
    body, // [optional] the data to write to the record
    query, // [optional] options for writing to the record
    metadata // contextual data used for logging, and written to the data for audit purposes
}
```

`absorbHandler`'s input is the same, but accepts an additional property `absorbedCode`. `body` is only used by patch and post.

The input can be generated from a http request (or equivalent object) by setting the url parameters as top level properties, and setting the request body and query string as nested objects within the input. Metadata is an object containing contextual information about the request.

## Output

Each handler returns objects of the following structure

```
{
    status, // http status code describing the type of response
    body // data to be returned to the user
}
```

`headHandler` does not return `body`

### Error output

With the exception of internal server errors, all errors thrown are instances of `HttpErrors` and have a `status` and `message` property. `status` is a http status.

## Body structure

Both input and output body has structure similar to that below. The treecreeper schema powering the application defines exactly which properties are allowed

```json
{
	"someString": "A property stored on the record", // property
	"children": ["child1", "child2"], // relationship to multiple records
	"favouriteChild": "child1" // relationship to a single record
}
```

-   Any properties of a record are represented by strings, booleans and numbers assigned to properties of the body
-   Relationships to other records are represented as arrays of strings, or single strings if the relatonship is {many|one}-to-one. Each string is the code of the related record. As the schema defines which types a given relationship can point to, no information about the related type is contained in the body.
-   Output body will always contain a `code` property. This is optional in input body because `code` will always be given by the top level property of the input object which is usually derived from the RESTful url.
-   `code`s are immutable. When writing, if the `code` in the body does not match the one in the RESTful url, an error will be thrown
-   Input body can be used to delete individual properties or relationships
    -   Use `null` as the value to remove the property or to delete all relationships of the given type
    -   Use a `!` before the property name of a relationship to target individual relationships for deletion e.g. `"!children": ["child1"]`

### Metadata

The `metadata` object is typically constructed from information sent to the application in headers. Three properties are recognised:

-   `clientId` - the id of a particular application calling the handler, lowercase and may be hyphenated
-   `clientUserId` - the id of a user calling the api, lowercase, `.` delimited
-   `requestId` - unique id for the current request, typically a uuid.

`requestId` is required and must be unique per handler call. To use Treecreeper's field-locking capability a `clientId` must be sent.

### Query options

| name               | relevant handlers | value              | meaning                                                                                                                                                                 |
| ------------------ | ----------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| upsert             | post, patch       | `false` or missing | If the body has any relationships that reference any records that do not yet exist, a 400 error will be thrown                                                          |
|                    |                   | `true`             | If the body has any relationships that reference any records that do not yet exist, records will be created for them. These records will only contain a `code` property |
| relationshipAction | patch             | missing            | If the body defines any relationships, a 400 error will be thrown                                                                                                       |
|                    |                   | `merge`            | Existing relationships will be kept, and ones defined in the body will also be created                                                                                  |
|                    |                   | `replace`          | Existing relationships will be replaced by those specified in the body                                                                                                  |

#### Field locking

When writing using the post or patch handlers, it is possible, by means of the `lockFields` query option, to prevent fields from being modified by other clients. The `clientId` specified in `metadata` is used to specify which client the field is locked by. The `unlockFields` option can be used to unlock any field, regardless of which client locked it.

| name         | relevant handlers | value                             | meaning                                                                                                                         |
| ------------ | ----------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| lockFields   | post, patch       | `propertyName1,propertyName2,...` | Will lock all properties listed with the current `clientId`, regardless of whether a value is sent for them in the request body |
|              |                   | `all`                             | Will lock all properties sent in the body with the current `clientId`                                                           |
| unlockFields | patch             | `propertyName1,propertyName2,...` | Will unlock all properties listed                                                                                               |
|              |                   | `all`                             | Will remove all property locking settings from the record                                                                       |

### absorbHandler

This is used to merge one record, B, into another, A, using the following merge logic.

-   If a property is not defined on A but is defined on B, then the property will be copied from B to A
-   Any relationships between B and a third record, C, will become relationships between A and C
-   Any relationships between A and B will be removed
-   Finally A will still exist, but B will not

## Example

The following creates a connected record and then deletes it, encountering some user errors along the way

```js
const {postHandler, deleteHandler, patchHandler} = require('@treecreeper/api-rest-handlers');

const post = postHandler();
const patch = patchHandler();
const delete = deleteHandler();

// metadata objects in input omited for brevity
post({
    type: 'DogBreed',
    code: 'spaniel',
    body: {
        name: 'Spaniel',
        likes: ['walkies', 'tummy-rub']
    },
}) // upsert error

post({
    type: 'DogBreed',
    code: 'spaniel',
    body: {
        name: 'Spaniel',
        likes: ['walkies', 'tummy-rub']
    },
    query: {
        upsert: true
    }
}) // 200, successfully created

delete({
    type: 'DogBreed',
    code: 'spaniel',
}) // error, connected record

patch({
    type: 'DogBreed',
    code: 'spaniel',
    body: {
        likes: null
    },
}) // 200, successfully removed relatioships

delete({
    type: 'DogBreed',
    code: 'spaniel',
}) // 204, successfully deleted
```
