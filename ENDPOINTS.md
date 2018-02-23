
### Things to be aware of:
+ Node requests don't have a /node prefix in their url; relationship requests have /link
+ **id** is a field created by graphdb to hold its id - so we may want our id to be called something different
+ We use capitalization for our types, we should be case insensitive
+ API calls that return a json structure may need to include the id and type (as they are only visible as url params)
+ We don't have API calls to read all nodes of a type
+ We don't have API calls to read all relationships of a type
+ We don't have API calls for defining/updating/deleting types; we assume all are valid
+ We don't have API calls to delete attributes from a node
+ We don't have API calls for queries; just direct reads of known keys
+ We don't have API calls to navigate the relationships; just to return the list for each node
+ We don't have API calls that return attributes of related data - e.g. service tier of systems I own

# Biz Op API Endpoints
The interface currently supports single record actions as follows:

<details>
<summary>
## Read Node (and relationships)
</summary>
### To retrieve information about a node
### GET {apiRoot}/{nodetype}/{keyname}/{keyvalue}
#### examples:
+ get /product/id/ftcom
+ get /product/name/ft.com
#### params:
+ **nodetype** - 'Product', 'System', 'Contact' or 'Endpoint'
+ **keyname** - 'id' or the name of a unique attribute
+ **keyvalue**
    + if keyname = id, then this param is the unique internal graphdb ID of the record to read
    + if keyname != id, then this param is the value of the unique attribute
#### return:
+ **status** - 200 for success, 404 for not found, 400 for incorrect parameters, 500 for failure
+ a json object that lists all the attributes and relationships as follows:
```json
{
  "node": {
    "attr1": "value1",
    "attr2": "value2",
    "...."
  },
  "relationships": [
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    "...."
   ]
}
```
</details>

## Create Node (and relationships)
## To inset new nodes and their relationships
### POST {apiRoot}/{nodetype}/{keyname}/{keyvalue} {body}
#### examples:
+ post /contact/id/geoffthorpe {node:{name:"Geoff Thorpe"}}
+ post /contact/name/Geoff%20Thorpe {node:{email:"geoff.thorpe@ft.com"}}
#### params:
+ **nodetype** - 'Product', 'System', 'Contact' or 'Endpoint'
+ **keyname** - 'id' or the name of a unique attribute
+ **keyvalue**
    + if keyname = id, then this param is the unique internal graphdb ID of the record to read
    + if keyname != id, then this param is the value of the unique attribute
+ **body** - a json object that defines the node and its relationships as follows:
```json
{
  "node": {
    "attr1": "value1",
    "attr2": "value2",
    "...."
  },
  "relationships": [
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    "...."
   ]
}
```
#### return:
+ **status** - 200 for success, 409 for already exists, 400 for incorrect parameters, 500 for failure
+ a json object that lists all the created attributes and relationships as follows:
```json
{
  "node": {
    "attr1": "value1",
    "attr2": "value2",
    "...."
  },
  "relationships": [
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    "...."
   ]
}
```

## Update Node (and relationships)
## To update an exist node and its relationships
### PUT {apiRoot}/{nodetype}/{keyname}/{keyvalue} {partial body}
#### examples:
+ put /endpoint/id/dewey {node:{base:"dewey.in.ft.com"}}
+ put /endpoint/base/dewey.in.ft.com {node:{about:"_about"}}
#### params:
+ **nodetype** - 'Product', 'System', 'Contact' or 'Endpoint'
+ **keyname** - 'id' or the name of a unique attribute
+ **keyvalue**
    + if keyname = id, then this param is the unique internal graphdb ID of the record to read
    + if keyname != id, then this param is the value of the unique attribute
+ **body** - a json object that defines the fields in the node and its relationships that are to be changed as follows:
```json
{
  "node": {
    "attr1": "value1",
    "attr2": "value2",
    "...."
  },
  "relationships": [
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    "...."
   ]
}
```

#### return:
+ **status** - 200 for success, 404 for not found, 400 for incorrect parameters, 500 for failure
+ a json object that lists all the new content of ALL the node attributes and relationships as follows:
```json
{
  "node": {
    "attr1": "value1",
    "attr2": "value2",
    "...."
  },
  "relationships": [
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    "...."
   ]
}
```

## Upsert Node (and relationships)
## To create a new node and relationships or update the existing node and relationships
### PUT {apiRoot}/{nodetype}/{keyname}/{keyvalue} {partial body}
+ put /endpoint/id/dewey {node:{base:"dewey.in.ft.com"}}
+ put /endpoint/base/dewey.in.ft.com {node:{about:"_about"}}
#### params:
+ **nodetype** - 'Product', 'System', 'Contact' or 'Endpoint'
+ **keyname** - 'id' or the name of a unique attribute
+ **keyvalue**
    + if keyname = id, then this param is the unique internal graphdb ID of the record to read
    + if keyname != id, then this param is the value of the unique attribute
+ **body** - a json object that defines the fields in the node and its relationships that are to be changed as follows:
```json
{
  "node": {
    "attr1": "value1",
    "attr2": "value2",
    "...."
  },
  "relationships": [
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    "...."
   ]
}
```
#### return:
+ **status** - 200 for success, 400 for incorrect parameters, 500 for failure
+ a json object that lists all the new content of ALL the node attributes and relationships as follows:
```json
{
  "node": {
    "attr1": "value1",
    "attr2": "value2",
    "...."
  },
  "relationships": [
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    "...."
   ]
}
```

## Delete Node (and relationships)
## To remove an existing node and its relationships
### DELETE {apiRoot}/{nodetype}/{keyname}/{keyvalue}
+ delete /contact/id/alanturner
+ delete /contact/name/Alan%20Turner
#### params:
+ **nodetype** - 'Product', 'System', 'Contact' or 'Endpoint'
+ **keyname** - 'id' or the name of a unique attribute
+ **keyvalue**
    + if keyname = id, then this param is the unique internal graphdb ID of the record to read
    + if keyname != id, then this param is the value of the unique attribute
#### return:
+ **status** - 200 for success, 404 for not found, 400 for incorrect parameters, 500 for failure


## Create Relationship
## To inset new relationships between two nodes
### POST {apiRoot}/link/{nodetype}/{keyname}/{keyvalue}/{reltype}/{nodetype}/{keyname}/{keyvalue}
#### examples:
+ post /link/contact/id/geoffthorpe/worksfor/contact/id/sarahwells
+ post /link/contact/name/Geoff%20Thorpe/worksfor/contact/name/Sarah%20Wells
#### params:
+ **nodetype** - 'Product', 'System', 'Contact' or 'Endpoint'
+ **keyname** - 'id' or the name of a unique attribute
+ **keyvalue**
    + if keyname = id, then this param is the unique internal graphdb ID of the record to read
    + if keyname != id, then this param is the value of the unique attribute
+ **reltype** - the name of the relationship to create
#### return:
+ **status** - 200 for success, 400 for incorrect parameters, 500 for failure
+ a json object that lists all the new content of ALL the node attributes and relationships as follows:
```json
{
  "node": {
    "attr1": "value1",
    "attr2": "value2",
    "...."
  },
  "relationships": [
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    "...."
   ]
}
```

## Update Relationship
## To update relationships between two nodes
### PUT {apiRoot}/link/{nodetype}/{keyname}/{keyvalue}/{reltype}/{nodetype}/{keyname}/{keyvalue}
#### examples:
+ put /link/contact/id/geoffthorpe/worksfor/contact/id/sarahwells
+ put /link/contact/name/Geoff%20Thorpe/worksfor/contact/name/Sarah%20Wells
#### params:
+ **nodetype** - 'Product', 'System', 'Contact' or 'Endpoint'
+ **keyname** - 'id' or the name of a unique attribute
+ **keyvalue**
    + if keyname = id, then this param is the unique internal graphdb ID of the record to read
    + if keyname != id, then this param is the value of the unique attribute
+ **reltype** - the name of the relationship to create
#### return:
+ **status** - 200 for success, 400 for incorrect parameters, 500 for failure
+ a json object that lists all the new content of ALL the node attributes and relationships as follows:
```json
{
  "node": {
    "attr1": "value1",
    "attr2": "value2",
    "...."
  },
  "relationships": [
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    {
      "name": "relationshipType",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    "...."
   ]
}
```

## Delete Relationship
## To delete relationships between two nodes
### DELETE {apiRoot}/link/{nodetype}/{keyname}/{keyvalue}/{reltype}/{nodetype}/{keyname}/{keyvalue}
#### examples:
+ delete /link/contact/id/geoffthorpe/worksfor/contact/id/sarahwells
+ delete /link/contact/name/Geoff%20Thorpe/worksfor/contact/name/Sarah%20Wells
#### params:
+ **nodetype** - 'Product', 'System', 'Contact' or 'Endpoint'
+ **keyname** - 'id' or the name of a unique attribute
+ **keyvalue**
    + if keyname = id, then this param is the unique internal graphdb ID of the record to read
    + if keyname != id, then this param is the value of the unique attribute
+ **reltype** - the name of the relationship to create
#### return:
+ **status** - 200 for success, 400 for incorrect parameters, 500 for failure
