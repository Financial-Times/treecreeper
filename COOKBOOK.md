# Biz Ops API Cypher Cookbook

A place to keep examples of what we can do with this API.

## Recipes

#### Show me all the systems that @dan.murley is tech lead of,
```
MATCH m=(s:System)-[:technicalLead]->(c:Contact) WHERE c.id = 'danielmurley' return m
```

#### Show me people with a lot of technical systems assigned,
```
MATCH (c:Contact)<-[:technicalLead]-(s:System) WITH c, count(c) as r, collect(s) AS a
  WHERE r > 20 RETURN c, r, a
```

#### Show me the name of a system's (upp-mccm) product owner
```
MATCH (s:System)-[:productOwner]->(c:Contact) where s.id='upp-mccm' RETURN c.name
```

#### Show me the list of systems product owned by an individual (geoffthorpe)
```
MATCH (s:System)-[:productOwner]->(c:Contact) where c.id='geoffthorpe' RETURN s
```

#### Show me a list of the platinum system's system codes and names
```
MATCH (s:System) where s.serviceTier='Platinum' RETURN s.id, s.name
```

#### Remove an unwanted legacy attribute (due to it being replaced by a relationship)
```
MATCH (s:System) remove s.productOwnerName RETURN s.id
```

#### Show me high level counters for the population of critical system fields
```
MATCH (s:System) RETURN count(*) as systems, count(s.name) as names, count(s.serviceTier) as tiers, count(s.description) as descs
```

#### Show me the number of missing critical system attributes
```
MATCH (s:System) RETURN count(*) as systems, count(*)-count(s.name) as missing_names, count(*)-count(s.serviceTier) as missing_tiers, count(*)-count(s.description) as missing_descriptions
```

#### Show me a table of platinum system contacts
Still neeeds some work since we are trying to count multiple relationships. The current output is a count of each combination of relationships
```
MATCH (s:System) where s.serviceTier='Platinum'
optional match (s)-[:programme]->(p:Contact)
optional match (s)-[:productOwner]->(po:Contact)
optional match (s)-[:technicalLead]->(tl:Contact)
optional match (s)-[:primaryContact]->(pc:Contact)
optional match (s)-[:secondaryContact]->(sc:Contact)
return s.id, s.serviceTier, p.name, po.name, tl.name, pc.name, sc.name
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
