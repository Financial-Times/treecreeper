const db = require('../server/db-connection');
const nodeTypes = require('../server/lib/checks').nodeTypes;

const constraints = async (verb) => {
	console.log(`${verb}ing constraints...`);

	const constraintQueries = [
		`${verb} CONSTRAINT ON (s:supplier) ASSERT s.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (s:supplier) ASSERT exists(s.id)`,
		`${verb} CONSTRAINT ON (c:contract) ASSERT c.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (c:contract) ASSERT exists(c.id)`,
		`${verb} CONSTRAINT ON (r:response) ASSERT r.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (r:response) ASSERT exists(r.id)`,
		`${verb} CONSTRAINT ON (s:survey) ASSERT s.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (s:survey) ASSERT exists(s.id)`,
		`${verb} CONSTRAINT ON (s:survey) ASSERT exists(s.version)`,
	];

	for (let constraintQuery of constraintQueries) {
		try {
			await db.run(constraintQuery);
		}
		catch (e) {}
	}

	const constraints = await db.run('CALL db.constraints');
	console.log('CALL db.constraints ok?', verb, constraints.records);
	console.log('CALL db.constraints ok?', verb, constraints.records.length, constraintQueries.length);
};

const dropNodes = async (nodeType) => {
	console.log(`dropping nodes ${nodeType}...`);
	return await db.run(`MATCH (a:${nodeType}) DELETE a`);
};

const dropRelationships = async () => {
	console.log('dropping relationships...');
	return await db.run('MATCH ()-[o:OWNEDBY]->() DELETE o');
};

const createNodes = async () => {
	// TODO create some suppliers with contracts
	// TODO create all surveys
	// TODO create some responses
	// Uuse save endpoint to create nodes and relationships
};

if (process.env.NODE_ENV !== 'production') {
	// DROP
	constraints('DROP');
	dropRelationships();
	for (let nodeType of nodeTypes) dropNodes(nodeType);

	// CREATE
	constraints('CREATE');
	for (let nodeType of nodeTypes)	createNodes(nodeType);
}
