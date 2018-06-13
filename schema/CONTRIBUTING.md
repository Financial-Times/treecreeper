# Contributing to the biz-ops model

Do you know about something the business doesn't know enough about yet?

Then this is the place for you.

You can add 5 different types of thing to the database and API:

- Types
- Attributes on existing types
- Relationships
- Enums (aka drop down options)
- String validation rules

We'll cover them in reverse order, as enums and string patterns are vital to understand first

## String validation rules
These are expressed as regular expressions. The following rules are applied by default to anything you create

- NODE_TYPE - Pattern for the name of any new type. e.g `EachWordCapitalised` *Cannot be overridden*
- CODE - Pattern for the code of any new type. Can be overridden by specifying a different pattern in the `pattern` property of the `code` property of the type e.g. `hyphenated-words-or-12345`
-	RELATIONSHIP_NAME - Pattern for the name of any type of relationship e.g. `I_AM_A_RELATIONSHIP`. Note that this refers to the name of the relationship in the underlying database, not the name(s) surfaced in graphQL *Cannot be overridden*
- ATTRIBUTE_NAME - Pattern for any property on a type, or the graphQL property names used to refer to related nodes. e.g. `propertyName`, `isDirectorOf`

To add a rule add a new regular expression to the map in `schema/string-patterns.js`

## Enums
 > Todo - write this after we've discussed casing of enum fields

## Relationships
Relationships of any type (provided the obey the [naming rules](#string-validation-rules)) can be defined between any types.  Relationships are defined in `schema/relationships/relationships.yaml`. Each entry has the following format:

```yaml
PAYS_FOR: // name of the relationship type
  type: ONE_TO_MANY // ONE_TO_ONE, ONE_TO_MANY, MANY_TO_ONE or MANY_TO_MANY
  fromType: // One or more types the relationship can start at
    CostCentre: // The type name
      graphql:
        name: hasGroups // The property name in graphql used to refer to the related type
        description: The groups which are costed to the cost centre // graphql description
  toType: // One or more types the relationship can end at
    Group: // The type name
      graphql:
        name: hasBudget // The property name in graphql used to refer to the related type
        description: The Cost Centre associated with the group // graphql description
```

### What if the relationship can exist between lots of different types?

These must be added in pairs. Use an array to define a list of different pairs:

```yaml
PAYS_FOR:
  	-
  		type: ONE_TO_MANY
		  fromType:
		    ...
		  toType:
		    ...
```

## Types and type attributes
Types are defined in `schema/types`. Add a yaml file named after your type e.g. `MyType.yaml`. It's contents should be as follows:

```yaml
name: Bus // the type name
pluralName: Buses // optional plural name. Defaults to name with an 's' suffix
description: Big red things // description used in graphql ui
properties: // one or more properties defined directly on the type
  code: // required. Defines the code for the type
    type: String // Any graphql type (see below)
    required: true // whether or not the field is required
    canIdentify: true // whether the field can be used to identify a single record
    canFilter: true // whether the field is useful for filtering a list of records
    description: 'Unique code/id for this item' // description used in graphql ui
```

Graphql types are `String`, `Int`, `Float` and `Boolean`.

In addition to these, the name of any [enum](#enums) can be used
