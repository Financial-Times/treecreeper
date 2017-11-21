const db = require('../server/db-connection');
const nodeTypes = require('../server/lib/checks').nodeTypes;
const createSurveys = require('./surveys/create');
const createSuppliers = require('./suppliers/create');
const createSubmissions = require('./submissions/create');

const constraints = async (verb) => {
	console.log(`${verb}ing constraints...`);

	const constraintQueries = [
		`${verb} CONSTRAINT ON (s:Supplier) ASSERT s.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (s:Supplier) ASSERT exists(s.id)`,
		`${verb} CONSTRAINT ON (c:Contract) ASSERT c.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (c:Contract) ASSERT exists(c.id)`,
		`${verb} CONSTRAINT ON (r:Submission) ASSERT r.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (r:Submission) ASSERT exists(r.id)`,
		`${verb} CONSTRAINT ON (s:Survey) ASSERT s.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (s:Survey) ASSERT exists(s.id)`,
		`${verb} CONSTRAINT ON (s:Survey) ASSERT exists(s.version)`
	];

	for (let constraintQuery of constraintQueries) {
		try {
			await db.run(constraintQuery);
		}
		catch (e) {}
	}

	const constraints = await db.run('CALL db.constraints');
	console.log('CALL db.constraints ok?', verb, constraints.records.length);
};

const dropNodes = async (nodeType) => {
	console.log(`dropping nodes ${nodeType}...`);
	return await db.run(`MATCH (a:${nodeType}) DELETE a`);
};

const dropRelationships = async () => {
	console.log('dropping relationships...');
	await db.run('MATCH ()-[o:OWNEDBY]->() DELETE o');
	await db.run('MATCH ()-[o:ASKS]->() DELETE o');
	await db.run('MATCH ()-[o:RAISES]->() DELETE o');
	await db.run('MATCH ()-[o:ALLOWS]->() DELETE o');
	await db.run('MATCH ()-[o:SIGNS]->() DELETE o');
	await db.run('MATCH ()-[o:SUBMITS]->() DELETE o');
	await db.run('MATCH ()-[o:ANSWERS]->() DELETE o');
	await db.run('MATCH ()-[o:ANSWERS_QUESTION]->() DELETE o');
	await db.run('MATCH ()-[o:HAS]->() DELETE o');
};

const createNodes = async () => {
	createSurveys(db);
	createSuppliers(db);
	createSubmissions(db);
	// TODO create some suppliers with contracts
	// Uuse save endpoint to create nodes and relationships
};

const init = async () => {
	if (process.env.NODE_ENV !== 'production') {
		// DROP
		await constraints('DROP');
		await dropRelationships();
		for (let nodeType of nodeTypes) {
			await dropNodes(nodeType);
		}

		// CREATE
		await constraints('CREATE');
		await createNodes();
	}
};


init();