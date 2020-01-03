# Schema and graph data

The schema for a treecreeper application controls what kind of information it can store. This document outlines how the schema relates to the underlying data stores and the APIs and user interfaces provided by treecreeper.

## Why use a schema at all

neo4j does not in itself require a schema - any data can be written to it. However, for data to be useful it must be organised in _some_ way. Using a schema means we impose some structure, and this in turn means we can take advantage of things such as GraphQL (which requires strict data structures) and declarative coding styles (for example, building a UI by defining configuration and not writing any 'real code').

## Why use a custom schema format

The schema is used to generate three things

1. Validation rules for data that can be written to or requested from the REST API.
2. A GraphQL SDL schema to define the behaviour of the GraphQL API.
3. Metadata to power a CMS style user interface for the data, and - potentially - other representations of the data.

While GraphQL does define its own schema format, it is neither easy to extend with the custom properties we ned for requirements 1. and 3., and is also a format that is less familiar to the average developer and harder to perform automated validation on. In addition, there are many opportunities to avoid repetition by automation the construction of the GraphQL schema from a simpler, custom format.

This is not to say that the treecreeper schema is _simple_ - it helps us model some complex data structures, and as such there is some mecessary complexity involved.

## Types

In neo4j, records (aka 'nodes') can have one or more labels. To date, treecreeper only supports a single label per record. Although the records are not stored in a tabular structure, it's a useful analogy to think of each of these labels to be the name of a table. Treecreeper creates a unique index (or 'constraint') over each label. This is defined on the 'code' property of the records (for historical reasons, treecreeper uses 'code', not 'id', as the name of the field that contains the uniquely indexed values)

In the treecreeper schema each Type is defined in its own YAML file. At a minimum this contains the 'name' of the type and a list of properties that can be defined on it (properties can be thought of as columns in the table). Another fundamental property of a type is 'pluralName', though this will be inferred from 'name' if not explicitly specified.

## Properties

### neo4j and GraphQL primitive values

neo4j can store strings, booleans, numbers, Dates, Times and DateTimes as values on records, as well as lists of those values. These map pretty well to GraphQL's default primitive types, though not quite one to one. The neo4j-graphql-js library defines Date, Time and DateTime types which enable those values to be represented in GraphQl. tc-schema-sdk defines [a mapping](https://github.com/Financial-Times/treecreeper/blob/master/packages/tc-schema-sdk/data-accessors/primitive-types.js) of all the primitive neo4j types. In addition to this, GraphQL can define enums. These can be mapped to strings in neo4j.

### Defining properties in the treecreeper schema

Each type defined in the treecreeper schema defines a map of properties. The name of the property is mapped to a number of things. Most important among these is the type, which will be one of default types mentioned above, or the name of an enum. Enums are defined in a separate `enums.yaml` file.

Alongside the type information, property definitions typically contain lots of other metadata, including 'label' and 'description', which are used in the user interface.

## Relationships

So far we have enough structure in the schema to define different types of record. However, the main reason for basing treecreeper on neo4j and GraphQL is their ability to store and represent connected data.

### Graph data semantics

A conceptual hurdle in working with both neo4j and GraphQL at the same time is that they have very different concepts for representing relationships. neo4j-graphql-js provides the technical underpinnings for resolving this, but it's worth spending a little time internalising the two representations.

GraphQL, despite being the new cool thing, is fairly traditional in the way it represents connected data.

```graphql
SomeType (id: "123") {
    relatedThings {
        id
    }
}
```

The above can be thought of as an expressive way of representing the result of an api look up (`/relatedThings?rootId=123`), or an SQL join. There is no concrete 'relationship' here - just a record with a property on it that lists some other records that have been retrieved because _something_ (a hidden implementation detail) connects them. In Graph theory parlance, there is no public representation of edges.

Most of the time in GraphQL there will also be a corresponding backwards 'relationship':

```graphql
Thing (id: "123") {
    relatedSomeTypes {
        id
    }
}
```

So in GraphQL we have 2 records, and 2 names for the properties that use the hidden underlying relationship to get at related records.

neo4j is unusual in that relationships are _first class objects_. There are entities in the database that represent relationships and are meant to be accessed by the user. In neo4j there is no property on a record that points to its related records; there is, rather, a connection to a relationship (which has a direction and a type of its own, and potentially properties too), and that in turn connects to a related record.

neo4j-graphql-js reconciles these two rival semantics elegantly, but it's important to understand the equivalence in order to grasp why relationships in the treecreeper schema are represented as they are.

```
neo4j: (This)-[:RELATED_TO]->(That)

GraphQL:

type This {
   relatedThats: [That] @relation(name: "RELATED_TO", direction: "OUT")
}

type That {
   relatedThiss: [This] @relation(name: "RELATED_TO", direction: "IN")
}
```

### Defining simple relationships

The example above illustrates what data we need to define a relationship: the type of the relationship, which direction it points, and which type of record it can point at. So properties in the schema that define a relationship will have additional `relationship` and `direction` metadata, and their `type` will be the name of some other type we have defined. Without going into the detail here, this also gives us enough information to validate relationships when the user writes to the API.

### Defining properties on relationships

As mentioned above, a feature - and strength - of neo4j is that it has first class representations of relationships, which may have properties defined on them. This is the most difficult thing to model in the schema, involving defining a separate YAML file for the relationship, and referring to it with names that will remain an implementation detail, and not be exposed in the resulting APIs. Conceptually, it is very like defining a new type, but one that cannot be accessed in isolation; only by accessing another record and then reading data from the relationship 'edge'.

## In conclusion

Having a schema at the centre of treecreeper means we are able to maintain a GraphQL api, a REST api and a UI in one place, using a declarative coding style. The custom schema format aims to make authorship easier than the alternatives would (though it is, alas, still by no means _easy_). The internal structure of records, relationships between them, and metadata to aid with other purposes - such as building a UI - are all completely specified in the schema YAML files.
