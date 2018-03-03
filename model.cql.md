MATCH (n:Brand)-[r]->() delete r;
MATCH (n:Product)-[r]->() delete r;
MATCH (n:System)-[r]->() delete r;
MATCH (n:Person)-[r]->() delete r;
MATCH (n:Group)-[r]->() delete r;
MATCH (n:Area)-[r]->() delete r;
MATCH (n:Team)-[r]->() delete r;
MATCH (n:Supplier)-[r]->() delete r;

MATCH (n:Brand) delete n;
MATCH (n:Product) delete n;
MATCH (n:System) delete n;
MATCH (n:Person) delete n;
MATCH (n:Group) delete n;
MATCH (n:Area) delete n;
MATCH (n:Team) delete n;
MATCH (n:Supplier) delete n;

MATCH (n:CostCentre) delete n;
MATCH (n:Contract) delete n;
MATCH (n:HealthCheck) delete n;
MATCH (n:Repo) delete n;
MATCH (n:SLA) delete n;

CREATE CONSTRAINT ON (s:Brand) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT ON (s:Brand) ASSERT exists(s.id);
CREATE CONSTRAINT ON (s:Product) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT ON (s:Product) ASSERT exists(s.id);
CREATE CONSTRAINT ON (s:System) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT ON (s:System) ASSERT exists(s.id);
CREATE CONSTRAINT ON (s:Person) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT ON (s:Person) ASSERT exists(s.id);
CREATE CONSTRAINT ON (s:Group) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT ON (s:Group) ASSERT exists(s.id);
CREATE CONSTRAINT ON (s:Area) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT ON (s:Area) ASSERT exists(s.id);
CREATE CONSTRAINT ON (s:Team) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT ON (s:Team) ASSERT exists(s.id);
CREATE CONSTRAINT ON (s:Supplier) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT ON (s:Supplier) ASSERT exists(s.id);

MERGE (n:Person {name:"John Doe", id:"john.doe"});
MERGE (n:Person {name:"Dawn Budge", id:"dawn.budge"});
MERGE (n:Person {name:"Gadi Weislovits", id:"gadi.weislovits"});
MERGE (n:Person {name:"David Griffith", id:"david.griffith"});
MERGE (n:Person {name:"Sarah Wells", id:"sarah.wells"});
MERGE (n:Person {name:"Georgiana Bogdan", id:"georgiana.bogdan"});
MERGE (n:Person {name:"Rik Still", id:"richard.still"});
MERGE (n:Person {name:"Matt Chadburn", id:"matt.chadburn"});


CREATE (n:Team {id:"myft"});
CREATE (n:Supplier {id:"fastly"});
CREATE (n:Team {id:"compliance"});
CREATE (n:Team {id:"gdpr-tooling"});
CREATE (n:Group {id:"cp", name: "Customer Products"});
CREATE (n:Group {id:"ip", name: "Internal Products"});
CREATE (n:Group {id:"onr", name: "O&R"});
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

MATCH (n:Person {id:"dawn.budge"}), (t:Team {id:"myft"})
MERGE (t)-[r:HAS]->(n);

MATCH (n:Person {id:"gadi.weislovits"}),(p:Group {id:"cp"})
MERGE (p)-[r:HAS {role: 'PO'}]->(n);

MATCH (n:Person {id:"david.griffith"}),(p:Group {id:"ip"})
MERGE (p)-[r:HAS {role: 'PO'}]->(n);

MATCH (n:Person {id:"sarah.wells"}),(p:Group {id:"onr"})
MERGE (p)-[r:HAS {role: 'PO'}]->(n);

MATCH (n:Team {id:"myft"}), (m:System {id:"ft-next-myft-api"})
MERGE (n)-[r:SUPPORTS]->(m);

MATCH (n:Group {id:"cp", name: "Customer Products"}),(p:Team {id:"myft"})
MERGE (n)-[r:HAS]->(p);
MATCH (n:Group {id:"cp", name: "Customer Products"}),(p:Product {id:"ftcom"})
MERGE (n)-[r:OWNS]->(p);
MATCH (n:Group {id:"cp", name: "Customer Products"}),(p:Product {id:"ftapp"})
MERGE (n)-[r:OWNS]->(p);

MATCH (n:Person {id:"richard.still"}),(p:Group {id:"cp"})
MERGE (n)-[r:LEADS]->(p);

MATCH (n:Person {id:"matt.chadburn"}),(p:Group {id:"ip"})
MERGE (n)-[r:LEADS]->(p);

MATCH (n:Area {id:"tech"}),(p:Group {id:"cp"})
MERGE (n)-[r:HAS]->(p);
MATCH (n:Area {id:"tech"}),(p:Group {id:"ip"})
MERGE (n)-[r:HAS]->(p);

MATCH (n:Area {id:"product"})
MERGE (n)-[r:HAS]->(p:Group {id:"origami"});


MATCH (n:Product {id:"ftcom"})
MERGE (n)-[r:DEPENDS_ON]->(p:Product {id:"fastly", name:"Fastly CDN Service"});

MATCH (n:Product {id:"fastly"}),(p:Contract {id:"fastly"})
MERGE (n)-[r:PAID_VIA]->(p);

MATCH (n:Supplier {id:"fastly"}),(p:Contract {id:"fastly"})
MERGE (n)-[r:SIGNS]->(p);

MATCH (n:Product {id:"fastly"})
MERGE (n)-[r:USES]->(s:System {id:'fastly-config-ft'});

MATCH (n:Product {id:"fastly"})
MERGE (n)-[r:USES]->(s:System {id:'fastly-config-foo'});

MATCH (n:System {id:"fastly-config-ft"})
MERGE (n)-[r:USES]->(p:Repo {id:"fastly-config-ft", url:"https://github.com/Financial-Times/fastly-config-ft"});

MATCH (n:System {id:"fastly-config-foo"})
MERGE (n)-[r:USES]->(p:Repo {id:"fastly-config-foo", url:"https://github.com/Financial-Times/fastly-config-foo"});

MATCH (n:Team {id:"compliance"})
MERGE (n)-[r:CONSUMES]->(p:Product {id:"sar-hub", name:"System to process SARs"});

MATCH (n:Group {id:"ip"}),(p:Product {id:"sar-hub", name:"System to process SARs"})
MERGE (n)-[r:OWNS]->(p);

MATCH (n:Person {id:"georgiana.bogdan"}),(p:Product {id:"sar-hub"})
MERGE (n)-[r:OWNS]->(p);

MATCH (n:Group {id:"ip"}),(p:Team {id:"gdpr-tooling"})
MERGE (n)-[r:HAS]->(p);

MATCH (n:Team {id:"gdpr-tooling"}), (m:System {id:"gdpr-sar-hub"})
MERGE (n)-[r:SUPPORTS]->(m);

MATCH (n:Team {id:"gdpr-tooling"}), (m:System {id:"gdpr-biz-op-api"})
MERGE (n)-[r:SUPPORTS]->(m);

MATCH (n:Team {id:"gdpr-tooling"}),(p:Product {id:"sar-hub", name:"System to process SARs"})
MERGE (n)-[r:OWNS]->(p);

MATCH (n:Product {id:"sar-hub"})
MERGE (n)-[r:USES]->(p:System {id:"gdpr-sar-hub", name:"SAR Hub UI"});

MATCH (n:Product {id:"sar-hub"})
MERGE (n)-[r:USES]->(p:System {id:"gdpr-biz-op-api", name:"Biz Op API"});

MATCH (n:System {id:"gdpr-sar-hub"}),(p:System {id:"gdpr-biz-op-api"})
MERGE (n)-[r:DEPENDS_ON {reason: "some reason here"}]->(p);

MATCH (n:Group {id:"cp"})
MERGE (n)-[r:OWNS]->(p:CostCentre {id:"xt111"});

MATCH (n:Group {id:"ip"})
MERGE (n)-[r:OWNS]->(p:CostCentre {id:"xt222"});

MATCH (n:System {id:"ft-next-myft-api"})
MERGE (n)-[r:IS]->(p:SLA {id:"platinum"});