# Biz Ops API Cypher Cookbook

A place to keep examples of what we can do with this API.

## Recipes

#### Show me all the systems that @dan.murley is tech lead of,
```
MATCH (s:System)-[:technicalLead]->(c:Contact) WHERE c.id = 'danielmurley' return m
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

#### Show me a table of the presence of system contacts
Still neeeds some work since we are trying to count multiple relationships. The current output is a count of each combination of relationships
```
RETURN count(*) as systems,
       size((s)-[:programme]->(:Contact)) as programme,
       size((s)-[:productOwner]->(:Contact)) as productOwners,
       size((s)-[:technicalLead]->(:Contact)) as technicalLeads,
       size((s)-[:primaryContact]->(:Contact)) as primary,
       size((s)-[:secondaryContact]->(:Contact)) as secondary
```


