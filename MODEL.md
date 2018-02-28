# Current BizOp data model (WIP)

This is a snapshot example of the BizOp model. For the full model please run `db.schema()`

<img src="https://user-images.githubusercontent.com/3425322/36786933-213cddd4-1c80-11e8-9f27-b636e7be4bca.png">

## Concepts

### Brand
Externally facing, consumed by subscribers, serve news content. Generally in Bede's radar. Each `Brand` must have one or more people (`Person`) who `REPRESENTS` it, serving as the primary contact for it.

Brands can be created and decommissioned.

### Product
Things recognized as products by the Product team.

External-facing `Product`s are always associated with a `Brand` (e.g. The FT.com brand is made up of the FT.com website, the FT Web App,... which are products).

Internal-facing ones are not tied to brands but they will generally have an internal audience: a `Team` that `USES` it.

### System
Internally, a system is something made up of code that can be deployed. Sites, APIs, lambdas, micro-services. If you can deploy it, it's a system. Things that are systems are `next-myft-api`, `gdpr-sar-hub`, ADD MORE EXAMPLES HERE.

Internal systems will be related to at least one `Team` that `SUPPORTS` it. `System`s could also have an additional `Team` that `OWN`s them but is not in charge of looking after them.

`System`s can be external too. An external `System` is provided by a `Supplier` and will always have a `Contract` associated with it. `Fastly` is such a system.

### People, Teams, Orgs and Areas
The Technology `Area` (CTO) contains several `Org`s such as Customer Products and Internal Products. An `Org` is made up of `Team`s, and those have `Person`s in them.

All of this data ultimate relates to people. In BizOp, all of our people data comes from the (People Api)[https://github.com/Financial-Times/ip-people-api]. This API is connected to Workday, Oracle, and all of our other sources of people and financial data. Any changes in those systems (e.g. someone resigns) will be reflected in the People API and automatically fed into BizOp



## Popular queries
#### What are the systems (and contracts, and suppliers) on my cost code, what products are they used by?
Products in cost centre XT111
```
MATCH (s:Product)<-[r:OWNS]-(o:Org)<-[l:LEADS]-(p:Person)-[q:OWNS]->(c:CostCentre {id:"xt111"}) RETURN s
```

#### Who is in charge of all the critical systems that I'm responsible for?
```
MATCH (:Person)-[:LEADS]->(:Org)-[:HAS]->(:Team)-[:SUPPORTS]->(s:System)<-[o:OWNS]-(p:Person) return p,s
```

#### ... any single person/team looking after 'too many' things?
#### What system are up for renewal in the next 90 days (or 180 days if it is a complex/expensive)? Show me 'days to renewal' on each system, alongside cost.
#### Show me systems that I'm responsible for with the most call outs / p1 / p2 problems.
#### Where are there key-person dependencies?
#### If we need to switch off system X because of an incident, what might be affected?
#### What system relates to this code repository? Useful for cybersecurity, who scan github repos and want to find the owner
#### What are the AWS costs for this technology cost centre? Cloud enablement want to do this, if they can find all the systemcodes associated with a cost centre they can find the resources tagged with those codes in AWS-land.
#### What critical systems are missing run book information? Or have broken links in that information? Useful for ops
#### What systems depend on this system? What systems does this system depend on?
#### In lieu of person x not existing any more (eg, left the company, holiday, not picking up their phone etc.) who is the next best person to contact about this system?
#### Which heroku apps don't have an associated system OR are associated with a system which doesn't have a cost centre?  (Same question for CDN config, Dyn entry or any other bit of infrastructure)
Cost centre associated to person, all the way to the top of the org, can always trace back a system to a cost centre. Could associate system-cc directly to override
#### Which of our systems which have a dependency on the datacentres (directly or indirectly) don't have a migration plan or decom plan associated with them?
#### Give me a list of live healthcheck endpoints associated with production systems which are used by editorial.  (Same question for other user groups)
#### Give me a list of contact details for teams who own systems which have a dependency on a given system (deduped by team)
#### How much of our estate is attributed to teams which don't report into the TLG?
#### Which groups of end users (internal & external) would be impacted if the Watford datacentre went on fire?
#### What is the impact of this Person leaving on support (or on their organisational knowledge)?




## Actions to prevent the model from going out of date
- Every Person in BizOp will be contacted every quarter to confirm they still own the things we think they own. They can reply Yes/No to that email to update our system. If `No` they'll have an easy way to transfer some/all to other people
- Leavers process: every time a person leaves or changes teams we will automatically update the data in BizOp (delete user, assign everything that person owned to their line manager, etc)


## Recreate the model (move out to own file)
```
MATCH (n:Brand)-[r]->() delete r;
MATCH (n:Product)-[r]->() delete r;
MATCH (n:System)-[r]->() delete r;
MATCH (n:Person)-[r]->() delete r;
MATCH (n:Org)-[r]->() delete r;
MATCH (n:Area)-[r]->() delete r;
MATCH (n:Team)-[r]->() delete r;
MATCH (n:Supplier)-[r]->() delete r;

MATCH (n:Brand) delete n;
MATCH (n:Product) delete n;
MATCH (n:System) delete n;
MATCH (n:Person) delete n;
MATCH (n:Org) delete n;
MATCH (n:Area) delete n;
MATCH (n:Team) delete n;
MATCH (n:Supplier) delete n;

CREATE CONSTRAINT ON (s:Brand) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT ON (s:Brand) ASSERT exists(s.id);
CREATE CONSTRAINT ON (s:Product) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT ON (s:Product) ASSERT exists(s.id);
CREATE CONSTRAINT ON (s:System) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT ON (s:System) ASSERT exists(s.id);
CREATE CONSTRAINT ON (s:Person) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT ON (s:Person) ASSERT exists(s.id);
CREATE CONSTRAINT ON (s:Org) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT ON (s:Org) ASSERT exists(s.id);
CREATE CONSTRAINT ON (s:Area) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT ON (s:Area) ASSERT exists(s.id);
CREATE CONSTRAINT ON (s:Team) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT ON (s:Team) ASSERT exists(s.id);
CREATE CONSTRAINT ON (s:Supplier) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT ON (s:Supplier) ASSERT exists(s.id);

CREATE (n:Person {id:"john.doe"});
CREATE (n:Person {id:"dawn.budge"});
CREATE (n:Person {id:"gadi.lahav"});
CREATE (n:Team {id:"myft"});
CREATE (n:Supplier {id:"fastly"});
CREATE (n:Team {id:"compliance"});
CREATE (n:Person {id:"richard.still"});
CREATE (n:Org {id:"cp", name: "Customer Products"});
CREATE (n:Area {id:"tech"});
CREATE (n:Area {id:"product"});

MATCH (n:Person {id:"john.doe"})
MERGE (n)-[r:REPRESENTS]->(p:Brand {id:"ftpaper"});

MATCH (n:Brand {id:"ftpaper"})
MERGE (n)-[r:HAS]->(p:Product {id:"ftcom", name:"FT.com"});
MATCH (n:Brand {id:"ftpaper"})
MERGE (n)-[r:HAS]->(p:Product {id:"ftapp", name:"FT App"});

MATCH (n:Product {id:"ftcom"})
MERGE (n)-[r:USES]->(p:System {id:"ft-next-signup", name:"FT B2C Signup Form"});
MATCH (n:Product {id:"ftcom"})
MERGE (n)-[r:USES]->(p:System {id:"ft-next-myft-page", name:"FT MyFT Page"});
MATCH (n:Product {id:"ftcom"})
MERGE (n)-[r:USES]->(p:System {id:"ft-next-myft-api", name:"FT MyFT API"});

MATCH (n:System {id:"ft-next-myft-api"})
MERGE (n)-[r:USES]->(p:Repo {id:"ft-next-myft-api", url:"https://github.com/Financial-Times/next-myft-api"});

MATCH (n:System {id:"ft-next-myft-page"}),(m:System {id:"ft-next-myft-api"})
MERGE (n)-[r:DEPENDS_ON]->(m);

MATCH (n:System {id:"ft-next-myft-api"})
MERGE (n)-[r:HAD]->(p:Incident {id:"123", url:"https://github.com/Financial-Times/next-bugs/blob/master/incidents/2017-02-14-Myft-emails-stopped-sending.md", status:"resolved", date:"some date"});

MATCH (n:Person {id:"dawn.budge"}), (m:System {id:"ft-next-myft-api"})
MERGE (n)-[r:OWNS]->(m);

MATCH (n:Person {id:"gadi.lahav"}),(p:Product {id:"ftcom"})
MERGE (n)-[r:OWNS]->(p);

MATCH (n:Team {id:"myft"}), (m:System {id:"ft-next-myft-api"})
MERGE (n)-[r:SUPPORTS]->(m);

MATCH (n:Org {id:"cp", name: "Customer Products"}),(p:Team {id:"myft"})
MERGE (n)-[r:HAS]->(p);
MATCH (n:Org {id:"cp", name: "Customer Products"}),(p:Product {id:"ftcom"})
MERGE (n)-[r:OWNS]->(p);
MATCH (n:Org {id:"cp", name: "Customer Products"}),(p:Product {id:"ftapp"})
MERGE (n)-[r:OWNS]->(p);

MATCH (n:Person {id:"richard.still"}),(p:Org {id:"cp"})
MERGE (n)-[r:LEADS]->(p);

MATCH (n:Area {id:"tech"}),(p:Org {id:"cp"})
MERGE (n)-[r:HAS]->(p);

MATCH (n:Area {id:"product"})
MERGE (n)-[r:HAS]->(p:Org {id:"origami"});


MATCH (n:Product {id:"ftcom"})
MERGE (n)-[r:USES]->(p:System {id:"fastly", name:"Fastly CDN Service"});

MATCH (n:System {id:"fastly"}),(p:Contract {id:"fastly"})
MERGE (n)-[r:PAID_VIA]->(p);

MATCH (n:Supplier {id:"fastly"}),(p:Contract {id:"fastly"})
MERGE (n)-[r:SIGNS]->(p);

MATCH (n:Team {id:"compliance"})
MERGE (n)-[r:CONSUMES]->(p:Product {id:"sar-hub", name:"System to process SARs"});

MATCH (n:Product {id:"sar-hub"})
MERGE (n)-[r:USES]->(p:System {id:"gdpr-sar-hub", name:"SAR Hub UI"});

MATCH (n:Product {id:"sar-hub"})
MERGE (n)-[r:USES]->(p:System {id:"gdpr-biz-op-api", name:"Biz Op API"});

MATCH (n:System {id:"gdpr-sar-hub"}),(p:System {id:"gdpr-biz-op-api"})
MERGE (n)-[r:DEPENDS_ON {reason: "some reason here"}]->(p);

MATCH (n:Person {id:"richard.still"})
MERGE (n)-[r:OWNS]->(p:CostCentre {id:"xt111"});

MATCH (n:System {id:"gdpr-sar-hub"})
MERGE (n)-[r:REPORTS_HEALTH_AT]->(p:HealthCheck {id:"abc", url:"url", status:"down"});

MATCH (n:System {id:"ft-next-myft-api"})
MERGE (n)-[r:IS]->(p:SLA {id:"platinum"});
```

