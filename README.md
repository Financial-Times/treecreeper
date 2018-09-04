# biz-ops-schema

Schema for biz-ops data store and api. It provides two things:

- yaml files which define which types, properties and relationships are allowed. These are intended to be edited by anybody who wants to add to the things the api models
- a nodejs library for accessing subsets this information

## API

### getType(type, options)

Get an object defining the structure of a given `type`. The following transforms will be executed on the raw yaml data.

- if no `pluralName` field is defined, it will be generated
- any named stringPatterns will be converted to validation functions

#### options

- `relationshipStructure` [default: `flat`]: Include the relationships for the type. Can take any value accepted by `getRelationships()` options. If it is set to `graphql` then the relationships are assigned to the `properties` object of the type as additional entries. Otherwise, they are assigned to a separate, top-level property, 'relationships'

### getAllTypes(options)

Get an array of objects definig the structure of all types. `options` are the same as for `getType`

### getEnums(options)

Retrieves an array of key:value object defining the acceptable values of an enum

#### options

- `withMeta`: wrap the enum in an object which also has metadata about the enum (e.g. 'description'.). In this case, the actual enum options will be in a `options` property

### getRelationships(typeName = undefined, options)

Gets relationships for a type.

#### options

- `structure` [default: `flat`] - 'flat': returns an array of relationships, both incoming and outgoing, for the type - 'graphql': returns an array of relationships, both incoming and outgoing, for the type, including variants defined for graphql e.g. recursive traversal of relationships - 'rest': returns an object grouping relationships by relationship type

### validateTypeName(typeName)

Validates that a type of the given name exists in the schema

### validateCode (typeName, code)

Validates that a code string matches the validation pattern defined for codes for the given type

### validateAttributeNames ( attributes )

Validates that names used for attributes are valid (i.e. camelCase)

### validateRelationship({nodeType, relatedType, relationshipType, relatedCode})

Validates that a relationship between a node and another node complies with the schema

### validateAttributes(typeName, attributes, throwInfo)

Validates that attribute values fora given type comply with the schema. Checks the type of each attribute and any string patterns

### getGraphQLDefs()

Retrieves graphql defs to be used to power a graphql api

### normalizeTypeName

Should be used when reading a type name from e.g. a url. Currently is a noop, but will allow consistent rolling out of more forgiving url parsing in futre if necessary

_The methods below are unimplemented_

### describeGraphqlQuery(query)

Decorates a graphql query with metadata from the schema

### describeGraphqlResult(query, result)

### describeRestApiResult(type, result, options)
