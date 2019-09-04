# biz-ops-schema model specifications

_Note that yaml files are indented with two spaces_

-   [Types](#types)
-   [Properties on existing types](#property-definitions)
-   [Relationships](#relationship-property-definitions) (which are expressed as a special kind of property)
-   [Enums](#enums) (aka drop down options)
-   [String validation rules](#string-validation-rules)

## Types

Types are defined in individual files in `schema/types`. Add a `.yaml` file named after your type e.g. `Cookie.yaml`, `DNSRecord.yaml`. Names of types should be singular, without punctuation, and with each word/abbreviation capitalised. The file expects the following properties:

| name                | required | default | details                                                                                                                                                                                                                                                                                                         | examples                                          |
| ------------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| name                | yes      |         | The name of the type. This should be exactly the same as the name of the file. It must begin with an upper case letter and contain only upper and lower case letters                                                                                                                                            | `CostCentre`, `FastlyInstance`                    |
| pluralName          | no       |         | The pluralised version of the type name. If not specified, defaults to the type name with an `s` appended                                                                                                                                                                                                       | `People`                                          |
| description         | yes      |         | Description of what kind of entity the type is. This can be spread over multiple lines and supports markdown. It is used to describe types in various parts of the biz-ops ecosystem, including documentation in the graphql-playground and when creating new instances in the biz-ops admin ui                 |                                                   |
| moreInformation     | no       |         | An optional extension to the description to allow an extended description for the type. This can be spread over multiple lines andsupports markdown. It is used to provide help in various parts of the biz-ops ecosystem, including item creation and view in the admin ui                                     |                                                   |
| properties          | yes      |         | An object containing one or more [Property Definintion](#property-definitions). Each key in this object defines the property name, and must be a camel-cased string, i.e. only letters and numbers, beginning with a lower case letter, with capital letters typically used to mark the beginning of a new word | property names: `officeLocation`, `supportsHttp2` |
| fieldsets           | no       |         | An object containing one or more [Fieldset Definition](#fieldset-definitions). Each key in this object defines the fieldset name, and must be a camel-cased string, i.e. only letters and numbers, beginning with a lower case letter, with capital letters typically used to mark the beginning of a new word  | fieldset names: `general`, `contactDetails`       |
| createPermissions   | no       |         | An array listing the names of systems that are allowed to create instances of this type. If not specified, any system is allowed to                                                                                                                                                                             | `- biz-ops-github-importer`                       |
| minimumViableRecord | no       |         | An array listing the names of properties of this type that are considered particularly important. This information can then be used by other systems to take action to ensure this data is entered                                                                                                              | `- delivereyTeam`                                 |
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

Biz-ops supports a number of custom primitive types, beyond those available in graphQL by default. Most of them are stored as Strings in the data layer, and do not have any strict conditions attached. They are intended as hints for the underlying systems storing the data, and any systems displaying it.

| type name | underlying data type | description                                                             |
| --------- | -------------------- | ----------------------------------------------------------------------- |
| Code      | String               | Should be used for the code property of a type                          |
| Name      | String               | Should be used for the name property of a type                          |
| Word      | String               | for ids and other very short strings, generally not allowing whitespace |
| Sentence  | String               | for short pieces of text                                                |
| Paragraph | String               | for longer pieces of text                                               |
| Document  | String               | for arbitrarily long pieces of text                                     |
| Url       | String               | Should be used for properties expected to contain urls                  |
| Email     | String               | Should be used for properties expected to contain email addresses       |
| Date      | String               | Dates, which should generally be input as ISO strings                   |
| Int       | Int                  | Integers                                                                |
| Float     | Float                | Decimal numbers                                                         |
| Boolean   | Boolean              | True or False                                                           |

### Relationship property definitions

All the options for [property definitions](#property-definitions) apply to relationship property definitions unless a rule below explicitly says otherwise

| name          | required | default                                                                            | details                                                                                                                                                                                                                                                                                                                                                          | examples                      |
| ------------- | -------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| type          | true     | Unlike for ordinary properties, this must be the name of some other [type](#types) | `CostCentre`, `System`                                                                                                                                                                                                                                                                                                                                           |
| relationship  | yes      |                                                                                    | The name of the underlying neo4j relationship. This should be all upper case, with words separated by underscores. It is hidden from the public APIs, and requires some familiarity with the underlying data. See existing type yaml files for examples, or ask for guidance in the [biz ops slack channel](https://financialtimes.slack.com/messages/C9S0V2KPV) | `HAS_TEAM_MEMBER`, `PAYS_FOR` |
| direction     | yes      |                                                                                    | Whether the underlying relationship should point away from – `outgoing` – or to – `incoming` – the record. Again, this requires familiarity with the underlying data. Please see existing examples or ask for help in the [biz ops slack channel](https://financialtimes.slack.com/messages/C9S0V2KPV)                                                           | `outgoing`, `incoming`        |
| hasMany       | no       | `false`                                                                            | Boolean indicating whether or not the record can be related in this way to more than one other record. If in doubt, set to `true`,                                                                                                                                                                                                                               |                               |
| isRecursive   | no       | `false`                                                                            | Boolean indicating whether the query used to populate this property should recursively traverse the relationship tree to retrieve records many steps removed from the parent record                                                                                                                                                                              |                               |
| showInactive  | no       | `true`                                                                             | Boolean indicating whether it is preferable to show or hide relationships to inactive records. Can be used as a hint by any UI                                                                                                                                                                                                                                   |
| writeInactive | no       | `false`                                                                            | Boolean indicating whether it is possible to write relationships to inactive records. Can be used as a hint by any UI or system writing to Biz Ops, but does not, at this stage, prevent writing at the API level                                                                                                                                                |

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

These are expressed as regular expressions and are used to (optionally) validate values. Define a pattern in `schema/string-patterns.yaml` by adding a property to the yaml file abserving the following rules:

-   The property name must be in CONSTANT_CASE
-   The value must be either
    -   a string that, when converted to a JavaScript regular expression, carries out the required string validation
    -   a object with two properties, `pattern` and `flags` which are used to create a regular expression with flags

## Enums

These are used to create enums/dropdown lists to restrict the values accepted in any field. For example `ServiceTier` is an enum with the values `Platinum`, `Gold` etc...

To define a new enum add a property to `schema/enums.yaml` with either an array of values, or (if any of the values contain a number) a map of key/value pairs

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
