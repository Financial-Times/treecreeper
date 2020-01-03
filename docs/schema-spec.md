# treecreeper schema specification

_Note that yaml files are indented with two spaces_

-   [Types](#types)
-   [Properties on existing types](#property-definitions)
-   [Primitive Types](#primitive-types)
-   [Relationships](#relationship-property-definitions) (which are expressed as a special kind of property)
-   [Custom cypher properties](#custom cypher properties)
-   [Enums](#enums) (aka drop down options)
-   [String validation rules](#string-validation-rules)
-   [Type Hierarchy](#type-hierarchy)
-   [Rich Relationships](#rich-relationships) i.e. relationships annotated with properties

## Types

Types are defined in individual files in a `types` subdirectory. Add a `.yaml` file named after your type e.g. `Cookie.yaml`, `DNSRecord.yaml`. Names of types should be singular, without punctuation, and with each word/abbreviation capitalised. The file expects the following properties:

| name                | required | default | details                                                                                                                                                                                                                                                                                                         | examples                                          |
| ------------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| name                | yes      |         | The name of the type. This should be exactly the same as the name of the file. It must begin with an upper case letter and contain only upper and lower case letters                                                                                                                                            | `CostCentre`, `FastlyInstance`                    |
| pluralName          | no       |         | The pluralised version of the type name. If not specified, defaults to the type name with an `s` appended                                                                                                                                                                                                       | `People`                                          |
| description         | yes      |         | Description of what kind of entity the type is. This can be spread over multiple lines and supports markdown. It is used to describe types in the graphql schema (and UIs powered by this such as graphiql) and in tc-ui                                                                                        |                                                   |
| moreInformation     | no       |         | An optional extension to the description to allow an extended description for the type. This can be spread over multiple lines andsupports markdown. It is used to provide additional information in the UI                                                                                                     |                                                   |
| properties          | yes      |         | An object containing one or more [Property Definintion](#property-definitions). Each key in this object defines the property name, and must be a camel-cased string, i.e. only letters and numbers, beginning with a lower case letter, with capital letters typically used to mark the beginning of a new word | property names: `officeLocation`, `supportsHttp2` |
| fieldsets           | no       |         | An object containing one or more [Fieldset Definition](#fieldset-definitions). Each key in this object defines the fieldset name, and must be a camel-cased string, i.e. only letters and numbers, beginning with a lower case letter, with capital letters typically used to mark the beginning of a new word  | fieldset names: `general`, `contactDetails`       |
| createPermissions   | no       |         | An array listing the codes of clients that are allowed to create instances of this type. If not specified, any client is allowed to                                                                                                                                                                             | `- my-type-importer`                              |
| minimumViableRecord | no       |         | An array listing the names of properties of this type that are considered particularly important. This information is used by tc-ui to ensure this data is entered                                                                                                                                              | `- deliveryTeam`                                  |
| inactiveRule        | no       |         | Many types have an `isActive` property, which is used to specify whether a particular record is active. Some types may use different properties to define this, and may define an `inactiveRule` object defining one or more property names and the values they can take that denote they are inactive          | `lifecycleStage: Decommissioned`                  |

### Property Definitions

Each property definition is an object with the following properties

| name         | required | default                                                    | details                                                                                                                                                                                                                                                                             | examples                   |
| ------------ | -------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| type         | yes      | `Code` on properties named `'code'`, otherwise `undefined` | This defines what kind of data can be stored in the property. It can be the name of any [primitive type](#primitive-types) or [enum](#enums)                                                                                                                                        | `Paragraph`, `ServiceTier` |
| label        | yes      |                                                            | A short label to be used when displaying this property in forms etc.                                                                                                                                                                                                                |                            |
| description  | yes      |                                                            | Description of what data is stored in the property. This is used to provide information in systems that allow viewing or modifying the data                                                                                                                                         |                            |
| required     | no       | `true` on properties named `'code'`, otherwise `false`     | Boolean defining whether or not the field is required                                                                                                                                                                                                                               |                            |
| unique       | no       | `true` on properties named `'code'`, otherwise `false`     | Boolean indicating if values in this property must be unique across all records of this type                                                                                                                                                                                        |                            |
| canIdentify  | no       | `true` on properties named `'code'`, otherwise `false`     | Boolean defining whether or not this field contains a 'pseudo id', i.e. a value that is unique, or almost unique, to a record, and can therefore be used in graphQL to query for a record e.g. a `Person` record's `email` property is a good example of a value that `canIdentify` |                            |
| trueLabel    | no       | 'Yes'                                                      | For properties with `Boolean` type, this defines the form label to use for the true option                                                                                                                                                                                          |                            |
| falseLabel   | no       | 'No'                                                       | For properties with `Boolean` type, this defines the form label to use for the false option                                                                                                                                                                                         |                            |
| examples     | no       |                                                            | Array of example values. This is not widely used but may e.g. be surfaced as placeholder text in a form                                                                                                                                                                             |                            |
| fieldset     | no       | 'misc'                                                     | The name of a fieldset to group this field in. Defaults to 'misc' which will e.g. put the field in the `Miscellaneous` fieldset at the end of edit pages                                                                                                                            |                            |
| useInSummary | no       | `true` on properties named `'code'`, otherwise `false`     | Boolean indicating if the property is considered an essential property to use when constructing a summary of the record. At present, this is used when presenting search results                                                                                                    |                            |
| pattern      | no       |                                                            | String which is the name of a [string matching pattern]string validation rule](#string-validation-rules).                                                                                                                                                                           | `CODE`, `MAX_LENGTH_64`    |

Note: All existing and any new properties, except for relationships, will automatically have the functionality to be filtered.

### Primitive types

In treecreeper, you can define as many primitive types as you like. The names of the types are provided to tc-ui, and allow different behaviours to be implemented e.g. both 'Word' and 'Paragraph' might use the underlying 'String' type in GraphQL, but one might use a text input in tc-ui, while the other uses a textarea

To define a primitive type, create a `primitive-types.yaml` file. This contains a map from type names to underlying GraphQL types and tc-ui component choices, e.g.

```
Paragraph:
    graphql: String
    component: LargeText
```

By default, tc-schema-sdk will include the following primitive types:

| type name | graphql type | component | description                                    |
| --------- | ------------ | --------- | ---------------------------------------------- |
| Code      | String       | Text      | Should be used for the code property of a type |
| String    | String       | Text      | Should be used for the name property of a type |
| Date      | Date         | Temporal  | Dates                                          |
| Time      | Time         | Temporal  | Times                                          |
| DateTime  | DateTime     | Temporal  | Fully qualified DateTimes                      |
| Int       | Int          | Number    | Integers                                       |
| Float     | Float        | Number    | Decimal numbers                                |
| Boolean   | Boolean      | Boolean   | True or False                                  |

### Relationship property definitions

All the options for [property definitions](#property-definitions) apply to relationship property definitions unless a rule below explicitly says otherwise.

For relationships which shoudl be annotated with their own properties, see the section on [rich relationships](#rich-relationships)

| name          | required | default                                                                            | details                                                                                                                                                                                                                                                                                                                                                          | examples                      |
| ------------- | -------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| type          | true     | Unlike for ordinary properties, this must be the name of some other [type](#types) | `CostCentre`, `System`                                                                                                                                                                                                                                                                                                                                           |
| relationship  | yes      |                                                                                    | The name of the underlying neo4j relationship. This should be all upper case, with words separated by underscores. It is hidden from the public APIs, and requires some familiarity with the underlying data. See existing type yaml files for examples, or ask for guidance in the [biz ops slack channel](https://financialtimes.slack.com/messages/C9S0V2KPV) | `HAS_TEAM_MEMBER`, `PAYS_FOR` |
| direction     | yes      |                                                                                    | Whether the underlying relationship should point away from – `outgoing` – or to – `incoming` – the record. Again, this requires familiarity with the underlying data. Please see existing examples or ask for help in the [biz ops slack channel](https://financialtimes.slack.com/messages/C9S0V2KPV)                                                           | `outgoing`, `incoming`        |
| hasMany       | no       | `false`                                                                            | Boolean indicating whether or not the record can be related in this way to more than one other record. If in doubt, set to `true`,                                                                                                                                                                                                                               |                               |  |  |
| showInactive  | no       | `true`                                                                             | Boolean indicating whether it is preferable to show or hide relationships to inactive records. Can be used as a hint by any UI                                                                                                                                                                                                                                   |
| writeInactive | no       | `false`                                                                            | Boolean indicating whether it is possible to write relationships to inactive records. Can be used as a hint by any UI or system writing to Biz Ops, but does not, at this stage, prevent writing at the API level                                                                                                                                                |

### Custom cypher properties

**Experimental**
Properties can contain the result of any cypher query run against the database. In order to do so add a `cypher` property to the property definition. This should contain a cypher query that returns either

-   one or more neo4j records, in which case the `type` of this property should be the same as the type of record returned, and `hasMany: true` may also be defined in order to indicate the return of multiple records
-   Some neo4j primitive value, in which case the `type` of this property should be a primitive type or an enum.

Note that, in most cases, you will want to 'anchor' your cypher query at the current record, so will need to use the `this` reference in it. See the [GRANDstack docs](https://grandstack.io/docs/neo4j-graphql-js.html#cypher-directive) for more details.

### Fieldset Definitions

Fieldsets group properties with other properties that are related to them e.g. all the properties defining relationships between systems might be grouped in a `relatedSystems` fieldset. This structure is not used in the underlying data store, but is rather applied at a later stage by anything using the data. Fieldsets are defined using ibjects with the following properties

| name        | required | default details | examples                                                     |
| ----------- | -------- | --------------- | ------------------------------------------------------------ |
| heading     | yes      |                 | The text to use as a heading for the group of properties     |  |
| description | no       |                 | The text to use as a description for the group of properties |  |

### Example type file

```yaml
name: Bus
pluralName: Buses
description: |
    Big red things
properties:
    code:
        type: Code
        required: true
        canIdentify: true
        canFilter: true
        description: 'Unique code/id for this item'
        label: Code
        fieldset: main
        examples:
            - LK60HPN
    isOperational:
        type: Boolean
        trueLabel: Bus runs on public roads
        falseLabel: Bus doesn't run or only runs off-road
fieldsets:
    main:
        heading: Main properties
        description: These are all essential to fill out.
```

## String validation rules

These are expressed as regular expressions and are used to (optionally) validate values. Define a pattern in `string-patterns.yaml` by adding a property to the yaml file abserving the following rules:

-   The property name must be in CONSTANT_CASE
-   The value must be either
    -   a string that, when converted to a JavaScript regular expression, carries out the required string validation
    -   a object with two properties, `pattern` and `flags` which are used to create a regular expression with flags

## Enums

These are used to create enums/dropdown lists to restrict the values accepted in any field. For example `ServiceTier` is an enum with the values `Platinum`, `Gold` etc...

To define a new enum add a property to `enums.yaml` with either an array of values, or (if any of the values contain a number) a map of key/value pairs

```yaml
Office:
  - OSB
  - Manila
  ...
StarRating:
  One: 1
  Two: 2
  ...
```

### Add Description

To better understand the enum options, you can give them a description

Set as a key value pair:

```yaml
Office:
    OSB: OSB description
    Manila: Manila description
```

## Type hierarchy

To aid in developing user interfaces that must list all types, a type-hierarchy must be defined, and each type must appear in it. The type hierarchy is a map, with each property of the map defining a label and description for the grouping, and an ordered list of types that should be contained within it, e.g.:

```yaml
politicalRegions
    label: Political Regions
    description: Areas of the world with some degree of political sovereignty
    types:
        - Country
        - Province
        - County
        - Borough
```

## Rich relationships

Relationships may be annotated with their own properties e.g. a `(Company)-[:EMPLOYS]->(Person)` relationship may want to add a start and end date to the `EMPLOYS` relationship. Defining this in the schema is a 2 step process

### 1. Create a relationship type

This should be in its own yaml file in a `relationships` subdirectory.

Relationship Types are defined in individual files in a `relationships`. Add a `.yaml` file named after what you want to call your relationship type (the name is not very important, and is an implementation detail that will be hidden from the end user) e.g. `EmploymentDetail.yaml`. Names of types should be singular, without punctuation, and with each word/abbreviation capitalised. The file expects the following properties:

| name         | required | details                                                                                                                                                                           | examples                                                                                                                                                                                                                                                                                                        |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name         | yes      | The name of the relationship type. This should be exactly the same as the name of the file. It must begin with an upper case letter and contain only upper and lower case letters | `EmploymentDetail`                                                                                                                                                                                                                                                                                              |
| relationship | yes      | The name of the underlying neo4j relationship. This should be all upper case, with words separated by underscores.                                                                | `EMPLOYS`                                                                                                                                                                                                                                                                                                       |
| from         | yes      | The type the relationship starts at                                                                                                                                               | `Company`                                                                                                                                                                                                                                                                                                       |
| to           | yes      | The type the relationship ends at                                                                                                                                                 | `Person`                                                                                                                                                                                                                                                                                                        |
|              |
| properties   | yes      |                                                                                                                                                                                   | An object containing one or more [Property Definintion](#property-definitions). Each key in this object defines the property name, and must be a camel-cased string, i.e. only letters and numbers, beginning with a lower case letter, with capital letters typically used to mark the beginning of a new word | property names: `officeLocation`, `supportsHttp2` |

# 2. Reference the relationship type from your types

In the example above, this would mean replacing the following:

```YAML
properties:
  employees:
    label: Employees
    hasMany: true
    description: Employees of this company
    type: Person
    relationship: EMPLOYS
    direction: outgoing
```

with

```YAML
properties:
  employees:
    label: Employees
    hasMany: true
    description: Employees of this company
    type: EmploymentDetail
```

Note that most properties remain unchanged - only the `type` and `relationship` properties need to change. In additional, if the relationship points between instances of the same type, it will be necessary to retain the `direction` property.
