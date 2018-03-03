# Current BizOp data model (WIP)

This is a snapshot example of the BizOp model. For the full model please run `db.schema()`

<img src="https://user-images.githubusercontent.com/3425322/36805022-31a7bb06-1cb4-11e8-8f18-453252bdbbc3.png">

## Concepts

### Brand ![#08474D](https://placehold.it/15/08474D/000000?text=+)

<img src="https://user-images.githubusercontent.com/3425322/36829252-396e2a98-1d16-11e8-87fd-7f7eb4f8a221.png" width="200px">

Externally facing, consumed by subscribers, serve news content. Generally in Bede's radar.

Each `Brand` must have one or more people (`Person`) who `REPRESENTS` it, serving as the primary contact for it.

Brands can be created and decommissioned.

### Product ![#0D7680](https://placehold.it/15/0D7680/000000?text=+)

<img src="https://user-images.githubusercontent.com/3425322/36829931-33cba7fc-1d19-11e8-8417-7c85b306fa17.png" width="300px">

Things recognized as products by the Product team. Normally attached to a product owner.

External-facing `Product`s are always associated with a `Brand` (e.g. The FT.com brand is made up of the FT.com website, the FT Web App,... which are products). These products are usually owned by the Customer Products `Group`

Internal-facing ones are not tied to brands but they will generally have an internal audience: a `Team` that `CONSUMES` it. These products are usually owned by `Group`s such as Internal Products, O&R... **DEFINE THIS**

### System ![#12A5B3](https://placehold.it/15/12A5B3/000000?text=+)
Internally, a system is something made up of code that can be deployed. Sites, APIs, lambdas, micro-services. If you can deploy it, it's a system. Things that are systems are `next-myft-api`, `gdpr-sar-hub`, **ADD MORE EXAMPLES HERE**

Internal systems will be related to at least one `Team` that `SUPPORTS` it. `System`s could also have an additional `Team` that `OWN`s them but is not in charge of looking after them.

`System`s can be external too. An external `System` is provided by a `Supplier` and will always have a `Contract` associated with it. `Fastly` is such a system.

### Person ![#FF1A66](https://placehold.it/15/FF1A66/CC1452?text=+), Team ![#CC1452](https://placehold.it/15/CC1452/CC1452?text=+), Group ![#990F3D](https://placehold.it/15/990F3D/CC1452?text=+) and Area ![#660A29](https://placehold.it/15/660A29/CC1452?text=+)
The Technology `Area` (CTO) contains several `Group`s such as Customer Products and Internal Products. An `Group` is made up of `Team`s, and those have `Person`s in them.

All of this data ultimate relates to people. In BizOp, all of our people data comes from the [People Api](https://github.com/Financial-Times/ip-people-api). This API is connected to Workday, Oracle, and all of our other sources of people and financial data. Any changes in those systems (e.g. someone resigns) will be reflected in the People API and automatically fed into BizOp

### Supplier ![#0A3866](https://placehold.it/15/0A3866/CC1452?text=+) and Contract ![#0F5499](https://placehold.it/15/0F5499/CC1452?text=+)

## Strategies to prevent the model from going out of date
- Every Person in BizOp will be contacted every quarter to confirm they still own the things we think they own. They can reply Yes/No to that email to update our system. If `No` they'll have an easy way to transfer some/all to other people
- Leavers process: every time a person leaves, is promoted or changes teams we will automatically update the data in BizOp (e.g. if the user left they are deleted, everything that person owned to their line manager, etc)


## Popular queries
#### What are the systems (and contracts, and suppliers) on my cost code, what products are they used by?
Products in cost centre XT111
```
MATCH (s:Product)<-[r:OWNS]-(o:Group)-[q:OWNS]->(c:CostCentre {id:"xt111"}) RETURN s
```

#### Who is in charge of all the critical systems that I'm responsible for?
```
MATCH (:Person)-[:LEADS]->(:Group)-[:HAS]->(:Team)-[:SUPPORTS]->(s:System)<-[o:OWNS]-(p:Person) return p,s
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

