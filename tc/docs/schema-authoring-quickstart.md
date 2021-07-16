# Schema authoring quickstart

You can add 8 different types of thing to the treecreeper schema:

-   Types - Each record stored in biz-ops must conform to a predefined type
-   Properties on types - If a record is an instance of a given type, the schema for that type determines which properties the record may have
-   Relationships between types - Different types can be connected to other types with different types of relationship
-   Enums - Some properties, e.g. serviceTier, may only take one value from a set. Enums define these sets of permissible values
-   String validation rules - Regular expressions for checking values
-   Primitive Types - Names for new primitive types, and mappings to the underlying GraphQL types and UI Components
-   Type Hierarchy - Defines grouping and ordering of types
-   Relationship Types - when you need to define properties on a relationship between types, you will need to define a relationship type to hold them

These define what can/cannot exist in the underlying neo4j database and the graphQL API.

This document will take you through the process of adding a new type, and along the way we'll cover how to add most of the other things too; if all you want to do is add one of those it'll probably help to skim this whole document, but skip ahead as you please.

The example we'll work through is adding the ability for a treecreeper schema to represent [**Birds of paradise**](https://en.wikipedia.org/wiki/Bird-of-paradise)

## Creating a basic type

1. Pick a name for your type. This must be a _singular_, capital case, string i.e. each word begins with a capital letter, no spaces, only letters. So for our example the name will be `BirdOfParadise` (not `BirdsOfParadise`)
1. Create a yaml file in [`./schema/types`](https://github.com/Financial-Times/biz-ops-schema/tree/master/schema/types) whose file name is the same as your type name e.g. `BirdOfParadise.yaml`.
1. Start filling your file with some basic, required information. Each type must have a name (the one you picked above) and a description, which should be a reasonably descriptive sentence describing _in the singular_ what an instance of this type is.
   The schema client library will automatically generate a `pluralName` property by appending `s` to the name, but if (as in our example) this doesn't work (BirdOfParadises :rofl: ), add one explicitly. Other top level fields also exist and may optionally be set. Refer to the [model spec](schema-spec.md#types).
   You will end up with something like the following:

```yaml
name: BirdOfParadise
pluralName: BirdsOfParadise
description: A bird of the family Paradisaeidae of the order Passeriformes.
```

1. Add your type name to one of the categories in [`./schema/type-hierarchy.yaml`](https://github.com/Financial-Times/biz-ops-schema/blob/master/schema/type-hierarchy.yaml). If it doesn't really fit well in any of the existing ones, or create a new type-hierarchy file which will look something like this:

```yaml
birdFamilies:
    label: Bird families
    description: Each family of birds has its own type
    types:
        - BirdOfParadise
```

## Thinking about properties

You could dive right in adding properties to your yaml file, but it pays to pause and think about each piece of information you want to store. You will be adding to a platform that others will be using, so try to get into the mindset of not just what makes sense to you at this stage, but also what will be useful to others from now on.

List the things you wish to store out and ask the following questions of them:

-   Is it broken down finely enough - would it make more sense to store as multiple properties e.g. rather than storing `populationEstimate` as a free text string, why not store `minPopulationEstimate` and `maxPopulationEstimate` as two number fields?
-   Could your free text properties be stored as enums instead? e.g. `genus` has a limited number of values within the _Paradisaeidae_ family, so create an enum listing them all, then you will not be at the mercy of typos in your data
-   If you're storing a list of data, or using an enum, would it make more sense to store as relationships to instances of other types? e.g. rather than `geographicRange: ['Indonesia', 'Papua New Guinea']` define a new `Country` type, and have relationships betwen `BirdOfParadise` and `Country`

Don't get too hung up on these choices, particularly if it's only going to be your team using the type you're creating at first; fields can be deprecated and replaced.

## Adding properties - basics

Properties on types have a [daunting number of options](schema-spec.md#property-definitions), but here we will concentrate on the essential ones first.

Each property must define:

-   `name`: A camel case string not beginning with a number e.g. `hasWattle`, `tailLengthToBodyRatio`. Give them names that make sense to you. The only convention is that `Boolean` properties should begin with `is`, `has` or similar
-   `label`: A short string, a few words long, that describes the property. Typically used to label form fields and admin pages. Do not end in a full-stop, and only capitalise the first word. In most cases it should just be an un-camel-cased version of the name e.g. `Place in folklore`
-   `description`: A longer string, giving as full a description as you like of the property. Will be parsed as markdown and displayed, among other places, in forms and in graphQL based user interfaces. Should end in a full stop
-   `type` - The type of data stored in the field. Refer to the [primitive types documentation](schema-spec.md#primitive-types)

All properties are defined as an object in yaml, with `name` as the key. In addition to the properties relevant to your type, each type **must** define a `code` property, and in most cases should have `name` and `description` properties to contain the human readable information about the record.

You should now have something that looks like the following (Although I've been lazy and not added `name` or `description` properties):

```yaml
name: BirdOfParadise
pluralName: BirdsOfParadise
description: A bird of the family Paradisaeidae of the order Passeriformes.
properties:
    code:
        type: Code
        label: Code
        description: The unique code for this bird of paradise.
    hasWattle:
        type: Boolean
        label: Has wattle
        description: Whether or not this species has a wattle.
    conservationInformation:
        type: Document
        label: Conservation information
        description: |
            Details of the [conservation status](https://www.iucnredlist.org/) of this species, and any past, present or future conservation programmes.
```

## Adding relationships

Adding relationships is very similar to adding normal properties, with a few important differences:

-   The `type` must refer to the name of another type defined in the schema files, not a primitive type
-   Additional information - `relationship`, `direction` and `hasMany` - must be set in order to define how neo4j should store the data, and how graphQL should represent it (see [the spec](schema-spec.md#relationship-property-definitions))
-   The relationship must be defined at both ends, so you will need to modify more than one type file!

### Example

Say I have another type called `Naturalist` and I want to add information on who discovered each species (we'll assume species can't be discovered by two people at the same time in order to illustrate some principles)

In the underlying database we'd probably represent this by a `DISCOVERED_BY` relationship (by convention, relationships are capitalised, with words separated by underscores). This relationship would point _from_ the `BirdOfParadise` and _to_ the `Naturalist`. In other words, from the `Naturalist`'s point of view it is _incoming_, and from the `BirdOfParadise`'s view it is _outgoing_'. `Naturalist`s may also discover more than one species, so from their point of view they may _have many_ relationships to`BirdOfParadise`s.

So now we've thought about all the additional information we need to model the relationship, and we can (once we've thought of a name, label and description) add a property to both types

#### Naturalist.yaml

```yaml
speciesDiscovered:
    type: BirdOfParadise
    relationship: DISCOVERED_BY
    direction: incoming
    hasMany: true
    name: ...
```

#### BirdOfParadise.yaml

```yaml
discoveredBy:
    type: Naturalist
    relationship: DISCOVERED_BY
    direction: outgoing
    name: ...
```

Note that we don't need to specify `hasMany` for any relationship that can only ever point at one record: it defaults to `false`, but you can add it if you want to for clarity.

## You're probably not finished yet

Please have a read through the [schema specification](schema-spec.md), which will tell you how to define enums, create validation rules for strings, group properties into fieldsets and add further configuration to properties and types. If you find anything confusing please raise an issue, or submit a pull request with a `work in progress` label and ask for comment.
