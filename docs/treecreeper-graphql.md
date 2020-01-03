# Treecreeper GraphQL

_This document presupposes familiarity with the basics of GraphQL. [https://www.howtographql.com/](https://www.howtographql.com/) provides a range of tutorial materials_

Treecreeper extends [GRANDstack](https://grandstack.io). At the heart of this architecture is the neo4j-graphql-js library, which provides a bridge between the graphql interface and the underlying neo4j database. In GraphQL terms, it resolves any GraphQL query by converting it to a single cypher query and executing it against a neo4j database.

Below are outlined the various interfaces available for querying in the treecreeper GraphQL API

## Access a single record of a type

Each type can be queried for an individual record, querying by any property that has `canIdentify: true` in the schema. e.g.

```graphql
{
	Person(email: "me@here.com") {
		name
	}
}
```

## List all records of a type

Using the `pluralName` of a type, all records can be listed. The default is to return all records, but you can paginate by using the `first` and `offset` options

```graphql
{
	People(first: 50, offset: 200) {
		name
	}
}
```

## Access related records

All relationships defined in the schema can be traversed by referencing the name of the property using that relationship

```graphql
{
	Person {
		employer {
			name
		}
	}
}
```

### Accessing properties on relationships

These can be accessed by using the special `_rel` suffic on relationship names. Note that the related record must be accessed using its type name, and also that temporal types (dates, times and datetimes) return objects which can have individual parts returned.

```graphql
{
	Person {
		employer_rel {
			startDate {
				year
				month
				day
			}
			Company {
				name
			}
		}
	}
}
```

## Filtering

Fiters can be used to select records tha satisfy certain criteria

### Simple filter example

```graphql
{
	People(filter: { name_starts_with: "Paul" }) {
		name
	}
}
```

### Complex filter example

The following will find peopel who are Female adn are either unemployed or work for the two companies specified. Queries can be built up with any level of nesting, and using a wide variety of comparison operators

```graphql
{
    People (filter: {
        OR: [
            employer_some: {name_in: ["FinTech Ltd", "AgriChem Ltd"]},
            employer: null
        ],
        gender: Female
    }) {
        name
    }
}
```

More information on the available filters can be found [on the GRANDstack website](https://grandstack.io/docs/graphql-filtering.html)
