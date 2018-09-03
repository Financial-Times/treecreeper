# biz-ops-schema
Schema for biz-ops data store and api. It provides two things:
- yaml files which define which types, properties and relationships are allowed
- a nodejs library for extracting subsets of this information

## API

### getType(type, options)
Get an object defining the structure of a given `type`. The following transforms will be executed on the raw yaml data.
- if no `pluralName` field is defined, it will be generated
- any named stringPatterns will be converted to validation functions

#### options
- `relationshipStructure` [default: `flat`]: Include the relationships for the type. Can take any value accepted by `gteRelationships()` options. If it is set to `graphql` then the relationships are assigned to the `properties` object of the type as additional entries. Otherwise,they are assigned to a separate, top-level property, 'relationships'

### getAllTypes(options)
Get an array of objects definig the structure of all types. `options` are the same as for `getType`

### getEnum(enumType)
Retrieves a key:value object defining the acceptable values of an enum

### getEnums()
Retrieves an array of key:value object defining the acceptable values of an enum

### getRelationship(name, type = undefined, direction = undefined)
Gets a relationship definition, possibly filtered by end node type or direction

### getRelationships(typeName = undefined, options)
Gets relationships for a type.

#### options
- `structure` [default: `flat`]
	- 'flat': returns an array of relationships, both incoming and outgoing, for the type
	- 'graphql': returns an array of relationships, both incoming and outgoing, for the type, including variants defined for graphql e.g. recursive traversal of relationships
	- 'rest': returns an object grouping relationships by relationship type


### getGraphQLSchema()
Retrieves a schema to be used to power a graphql api // note, may not be much use without being compiled

### describeGraphqlQuery(query)
Decorates a graphql query with metadata from the schema

### describeGraphqlResult(query, result)

### describeNode(type, result, options)

### validate(obj)
Unimplemented. Probably overkill for now, as API can be single source of truth, but could move in here in future

