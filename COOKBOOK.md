# Biz Ops API Query Cookbook

A place to keep examples of what we can do with this API and the underlying database

## GraphQl Recipes

#### Show me all the systems that @dan.murley is tech lead of,
```graphql
{
	Person (slack: "@dan.murley") {
		isTechLeadFor {
			code
		}
	}
}
```

#### Show me people with a lot of technical systems assigned,
The following will retrieve all people and list what they are tech leads for - it's left to the consumer to filter based on these
*Coming soon: ability to filter people by `isTechLead`*

```graphql
{
	People {
		name
		isTechLeadFor {
			code
		}
	}
}
```

#### Show me the name of a system's (upp-mccm) product owner
```graphql
{
	System (code: "upp-mccm") {
		supportedByTeam {
      deliveryLead {
        name
      }
    }
	}
}
```

#### Show me the list of systems product owned by an individual (geoffthorpe)
```graphql
{
	Person (code: "geoffthorpe") {
    isDeliveryLeadFor {
      owns {
        code
      }
    }
	}
}
```
#### Show me a list of the platinum system's system codes with support contacts
```graphql
{
	Systems (serviceTier: Platinum) {
		code
		name
    supportedByTeam {
      name
      email
      phone
      slack
    }
    supportedBySupplier {
      name
      email
      phone
    }
    ownedBy {
      deliveryLead {
        name
      }
      techLead {
        name
      }
    }
  }
}

```

## Cypher Recipes

#### Show me high level counters for the population of critical system fields
```
MATCH (s:System) RETURN count(*) as systems, count(s.name) as names, count(s.serviceTier) as tiers, count(s.description) as descs
```

#### Show me the number of missing critical system attributes
```
MATCH (s:System) RETURN count(*) as systems, count(*)-count(s.name) as missing_names, count(*)-count(s.serviceTier) as missing_tiers, count(*)-count(s.description) as missing_descriptions
```

### Show me which platinum service have missing contacts
```
MATCH (s:System) where s.serviceTier='Platinum'
optional match (s)-[:programme]->(p:Contact)
optional match (s)-[:productOwner]->(po:Contact)
optional match (s)-[:technicalLead]->(tl:Contact)
optional match (s)-[:primaryContact]->(pc:Contact)
optional match (s)-[:secondaryContact]->(sc:Contact)
with s, p, po, tl, pc, sc
where p.name is null or po.name is null or tl.name is null or pc.name is null or sc.name is null
return distinct s.id, s.serviceTier, p.name, po.name, tl.name, pc.name, sc.name
order by s.id
```

#### Show me all the platinum systems with their product owners
```
MATCH (s:System)-[:productOwner]->(c:Contact) where s.serviceTier='Platinum' RETURN c, s
```

#### Show me contacts who share the same email address (probably duplicates)
```
MATCH (n:Contact) WITH n.email as email, collect(n.id) AS nodes WHERE size(nodes) > 1 RETURN email, nodes as ContactIds ORDER BY email
```

#### Show me contacts with the same name but different email addresses (probably shouldn't have the same name)
```
MATCH (n:Contact) WITH n.email as email, collect(n.id) AS nodes WHERE size(nodes) > 1 RETURN email, nodes as ContactIds ORDER BY email
```
