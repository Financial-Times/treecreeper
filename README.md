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
- `withGraphQLRelationships` [default: `false`]: Include the graphql properties defined on the type which get their data via a neo4j relationship
- `withNeo4jRelationships` [default: `false`]: Include an array|object (need to work out what makes most sense) of neo4j relationships which are valid for this type

### getAllTypes(options)
Get an array of objects definig the structure of all types. `options` are the same as for `getType`

### getEnum(enumType)
Retrieves a key:value object defining the acceptable values of an enum

### getAllEnums()
Retrieves an array of key:value object defining the acceptable values of an enum

### getRelationship(name, type = undefined, direction = undefined)
Gets a relationship definition, possibly filtered by end node type or direction

### getRelationships(type = undefined, direction = undefined)
Gets a relationship definition, possibly filtered by end node type or direction


### getGraphQLSchema()
Retrieves a schema to be used to power a graphql api // note, may not be much use without being compiled

### describeGraphqlQuery(query)
Decorates a graphql query with metadata from the schema

### describeGraphqlResult(query, result)

### describeNode(type, result, options)
### validate(obj)
Unimplemented. Probably overkill for now, as API can be single source of truth, but could move in here in future

