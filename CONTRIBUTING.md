# Contributing to the biz-ops model

Do you know about something the business doesn't know enough about yet?

Then this is the place for you.

You can add 5 different types of thing to the database and API:

- [Types](#types-and-attributes)
- [Attributes on existing types](#attributes)
- [Relationships](#relationships)
- Enums (aka drop down options)
- String validation rules

## Types

Types are defined in individual files in `schema/types`. Add a `.yaml` file named after your type e.g. `Cookie.yaml`, `DNSRecord.yaml`. Names of types should be singular, without punctuation, and with each word/abbreviation capitalised. The files contents should be as follows:

```yaml
name: Bus // the type name
pluralName: Buses // optional plural name. Defaults to name with an 's' suffix
description: Big red things // description used in graphql ui
properties: // one or more properties defined directly on the type
  code: // required. Defines the code for the type
    type: String // Any primitive type or enum (see below)
    required: true // whether or not the field is required
    canIdentify: true // whether the field can be used to identify a single record
    canFilter: true // whether the field is useful for filtering a list of records
    description: 'Unique code/id for this item' // description used in graphql ui
    label: Code //Short label to be used when displaying this field in forms etc.
```

### Primitive types

Each property should have a type chosen from the following

- Word - for ids and other very short strings, generally not allowing whitespace
- Sentence - for short pieces of text
- Paragraph - for longer pieces of text
- Document - for arbitrarily long pieces of text
- Url - Urls
- Date - Dates, which shoudl generally be input as ISO strings
- Int - Integers
- Float - Decimal numbers
- Boolean - True or False

Most of the above will be mapped to Strings in the data layer, and do not have any strict conditions attached. They are intended as hints for the underlying systems storing the data, and any systems displaying it.

In addition to the above, the name of any [enum](#enums) can be used as the type of a property

Note that yaml files are indented with two spaces

## Attributes

To add attributes to any existing type, add them in the `properties` section of the type's `.yaml` file. Property names must be camelCased.

## Relationships

Relationships can be defined between any types. Relationships are defined in `schema/relationships.yaml`. Each entry has the following format:

```yaml
PAYS_FOR: // name of the relationship type - must be in CONSTANT_CASE
  cardinality: ONE_TO_MANY // ONE_TO_ONE, ONE_TO_MANY, MANY_TO_ONE or MANY_TO_MANY
  fromType: // One or more types the relationship can start at
    type: CostCentre // The type name
    name: hasGroups // The property name in graphql used to refer to the related type
    description: The groups which are costed to the cost centre // graphql description
    label: Groups // Used for labelling the property in user interfaces
  toType: // One or more types the relationship can end at
    type: Group // The type name
    name: hasBudget // The property name in graphql used to refer to the related type
    description: The Cost Centre associated with the group // graphql description
    label: Cost Centre // Used for labelling the property in user interfaces
```

In addition to the above, if a relationship is recursive in nature (e.g. a dependency tree for a system), the result of traversing this tree can be assigned, as a flattened list (or single node if traversing from many to one to ... to one), to a property by adding `recursiveName` and `recursiveDescription` to the graphql entries. If appropriate, when these recursive definitions are present then `name` and `description` may be omitted.

### What if the relationship can exist between lots of different types?

Use an array to define a list of pairs of end types:

```yaml
PAYS_FOR:
  - cardinality: ONE_TO_MANY
    fromType: ...
    toType: ...
  - cardinality: ...
  ...
```

## String validation rules

These are expressed as regular expressions and are used to (optionally) validate values. Define a pattern in `schema/string-patterns.yaml` by adding a property to the yaml file abserving the following rules:

- The property name must be in CONSTANT_CASE
- The value must be either
  - a string that, when converted to a JavaScript regular expression, carries out the required string validation
  - a object with two properties, `pattern` and `flags` which are used to create a regular expression with flags

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
