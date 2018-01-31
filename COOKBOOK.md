# Biz Ops API Cypher Cookbook

A place to keep examples of what we can do with this API.

## Recipes

Show me all the systems that @dan.murley is tech lead of,

```
MATCH (n:System)-[:technicalLead]->(m:Contact) WHERE m.id = 'danielmurley' return m
```

Show me people with a lot of technical systems assigned,

```
MATCH (n:Contact)-[:technicalLead]->(m:System) WITH n, count(n) as r, collect(m) AS c 
  WHERE r > 20 RETURN n, r, c
```

