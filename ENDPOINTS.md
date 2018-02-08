# Biz Op API Endpoints

The interface currently supports both single record update as follows:

## Read
### To retrieve information about a node
### GET {apiRoot}/node/{type}/{key}
#### params:
+ **type** - 'System', 'Contact' or 'Endpoint'
+ **key**
    + the unique graphdb ID of the record to read
    + or the unique dewey id of the record to read (e.g. systemcode)
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
      "from": "subjectType",
      "fromAttrName": "id",
      "fromAttrValue": "subjectID",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    {
      "name": "relationshipType",
      "from": "subjectType",
      "fromAtrrName": "id",
      "fromAttrValue": "subjectID",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    "...."
   ]
}
```

## Create
## To inset new nodes and their relationships
### POST {apiRoot}/node/{type}/{key} {body}
#### params:
+ **type** - 'System', 'Contact' or 'Endpoint'
+ **key**
     + the unique graphdb ID of the record to read
     + or the unique dewey id of the record to read (e.g. systemcode)
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
      "from": "subjectType",
      "fromAttrName": "id",
      "fromAttrValue": "subjectID",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    {
      "name": "relationshipType",
      "from": "subjectType",
      "fromAttrName": "id",
      "fromAttrValue": "subjectID",
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
      "from": "subjectType",
      "fromAttrName": "id",
      "fromAttrValue": "subjectID",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    {
      "name": "relationshipType",
      "from": "subjectType",
      "fromAttrName": "id",
      "fromAttrValue": "subjectID",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    "...."
   ]
}
```

## Update
## To update an exist node and its relationships
### PUT {apiRoot}/node/{type}/{key} {partial body}
#### params:
+ **type** - 'System', 'Contact' or 'Endpoint'
+ **key**
    + the unique graphdb ID of the record to update
    + or the unique dewey id of the record to update (e.g. systemcode)
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
      "from": "subjectType",
      "fromAttrName": "id",
      "fromAttrValue": "subjectID",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    {
      "name": "relationshipType",
      "from": "subjectType",
      "fromAttrName": "id",
      "fromAttrValue": "subjectID",
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
      "from": "subjectType",
      "fromAttrName": "id",
      "fromAttrValue": "subjectID",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    {
      "name": "relationshipType",
      "from": "subjectType",
      "fromAttrNamee": "id",
      "fromAttrValue": "subjectID",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    "...."
   ]
}
```
## Upsert?
## To create a new node and relationships or update the existing node and relationships
### PUT {apiRoot}/node/{type}/{key} {partial body}
#### params:
+ **type** - 'System', 'Contact' or 'Endpoint'
+ **key**
    + the unique graphdb ID of the record to create/update
    + or the unique dewey id of the record to create/update (e.g. systemcode)
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
      "from": "subjectType",
      "fromAttrName": "id",
      "fromAttrValue": "subjectID",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    {
      "name": "relationshipType",
      "from": "subjectType",
      "fromAttrName": "id",
      "fromAttrValue": "subjectID",
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
      "from": "subjectType",
      "fromAttrName": "id",
      "fromAttrValue": "subjectID",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    {
      "name": "relationshipType",
      "from": "subjectType",
      "fromAttrName": "id",
      "fromAttrValue": "subjectID",
      "to": "objectType",
      "toAttrName": "id",
      "toAttrValue": "objectID"
    },
    "...."
   ]
}
```

## Delete
## To remove an existing node and its relationships
### DELETE {apiRoot}/node/{type}/{key}
#### params:
+ **type** - 'System', 'Contact' or 'Endpoint'
+ **key**
    + the unique graphdb ID of the record to delete
    + or the unique dewey id of the record to delete (e.g. systemcode)
#### return:
+ **status** - 200 for success, 404 for not found, 400 for incorrect parameters, 500 for failure
