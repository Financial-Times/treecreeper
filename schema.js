const db = require('./server/db-connection');

const constraints = async (verb) => {


	// CREATE (a:System {code: "SARHub"}) RETURN a
	// CREATE (a:Product {code: "SARHub"}) RETURN a
	// CREATE (a:Product {code: "SARHub"})-[r:HAS]->(b:System {code: "SARHub"}) RETURN r

	const constraintQueries = [
		`${verb} CONSTRAINT ON (a:Product) ASSERT a.code IS UNIQUE`,
		`${verb} CONSTRAINT ON (a:Product) ASSERT exists(a.code)`,

		`${verb} CONSTRAINT ON (a:System) ASSERT a.code IS UNIQUE`,
		`${verb} CONSTRAINT ON (a:System) ASSERT exists(a.code)`,

		`${verb} CONSTRAINT ON (a:Component) ASSERT a.code IS UNIQUE`,
		`${verb} CONSTRAINT ON (a:Component) ASSERT exists(a.code)`,

		`${verb} CONSTRAINT ON (a:Team) ASSERT a.code IS UNIQUE`,
		`${verb} CONSTRAINT ON (a:Team) ASSERT exists(a.code)`,
	];

	const setupConstraintIfPossible = (constraintQuery) => db.run(constraintQuery).catch((e) => Promise.resolve(e));

	const constraints = await Promise.all(
		constraintQueries.map(setupConstraintIfPossible)
	).then(() => db.run('CALL db.constraints'));

	console.log('CALL db.constraints ok?', verb, constraints.records.length);
};

const relationships = async (verb, verb2) => {

	const queries = [
		`${verb} (a:Product {code: "FT.com"})-[r:HAS]->(b:System {code: "MyFT"}) ${verb2} r`,
		`${verb} (a:System {code: "MyFT"})-[r:HAS]->(b:Component {code: "MyFT API"}) ${verb2} r`,
		`${verb} (a:System {code: "MyFT"})-[r:HAS]->(b:Component {code: "MyFT Page"}) ${verb2} r`,
		`${verb} (a:Person {email: "gadi.lahav@ft.com"})-[r:OWNS_PRODUCTS_IN]->(b:Team {code:"CP"}) ${verb2} r`,
	];

	for (let query of queries) {
		await db.run(query);
	}
};

const schema = async () => {
	await constraints('DROP');
	await relationships('MATCH', 'DELETE');

	// await constraints('CREATE');
	// await relationships('CREATE', 'RETURN');
};

schema();


// CREATE CONSTRAINT ON (s:Supplier) ASSERT s.id IS UNIQUE


// CREATE (a:Product {code: "FT.com"}) RETURN a
// CREATE (a:System {code: "MyFT"}) RETURN a
// CREATE (a:Component {code: "MyFT API"}) RETURN a
// CREATE (a:Component {code: "MyFT Page"}) RETURN a


// CREATE (a:Team {code: "CP", name: "Customer Products"})
// CREATE (a:Team {code: "CP"})-[r:OWNS]->(b:Product) RETURN r




// Is MyFT a product (it has a product owner)
// FT.com as a product may be too wide, even if it appears in someone's list
// MyFT API is a component, but it's also deployable



// - Go over model draft
// - Discuss what we want a product, system, component, team to be
// - Run a few examples and check we all agree what each of them is
// - Team: Internal Products will be around for a while, GDPR Tooling only a few monhts
// - What to do with product owner relationships? ie James owns MyFT - these change every few months and are not automatable. Should all FT.com products point to Gadi instead? Do we really need to reflect the PO relationship?
// - when we detect role changes (from people api sns message...?) we ask that person if they stll own what we think they own

// Givens
// - All systems belong to a product
// - all components belong to a system
// - all products are owned by a team
// - Every x months we send an email to any People associated to any Thing asking 'do you still own this thing' - reply yes no in the email and we update the rships. Reply with the email of the new owner if you know it