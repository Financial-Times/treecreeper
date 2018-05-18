const { session: db } = require('../server/db-connection');
const nodeTypes = require('../server/lib/checks').nodeTypes;
const createSurveys = require('./surveys/create');

const constraints = async verb => {
	console.log(`Running ${verb} constraints...`);

	const constraintQueries = [
		`${verb} CONSTRAINT ON (s:Supplier) ASSERT s.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (s:Supplier) ASSERT exists(s.id)`,
		`${verb} CONSTRAINT ON (c:Contract) ASSERT c.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (c:Contract) ASSERT exists(c.id)`,
		`${verb} CONSTRAINT ON (r:Submission) ASSERT r.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (r:Submission) ASSERT exists(r.id)`,
		`${verb} CONSTRAINT ON (s:Survey) ASSERT s.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (s:Survey) ASSERT exists(s.id)`,
		`${verb} CONSTRAINT ON (s:Survey) ASSERT exists(s.version)`,
		// cmdb constainsts
		`${verb} CONSTRAINT ON (s:Domain) ASSERT s.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (s:Domain) ASSERT exists(s.id)`,
		`${verb} CONSTRAINT ON (c:Endpoint) ASSERT c.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (c:Endpoint) ASSERT exists(c.id)`,
		`${verb} CONSTRAINT ON (r:Group) ASSERT r.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (r:Group) ASSERT exists(r.id)`,
		`${verb} CONSTRAINT ON (s:Person) ASSERT s.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (s:Person) ASSERT exists(s.id)`,
		`${verb} CONSTRAINT ON (s:Product) ASSERT s.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (s:Product) ASSERT exists(s.id)`,
		`${verb} CONSTRAINT ON (s:Repository) ASSERT s.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (s:Repository) ASSERT exists(s.id)`,
		`${verb} CONSTRAINT ON (s:System) ASSERT s.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (s:System) ASSERT exists(s.id)`,
		`${verb} CONSTRAINT ON (s:Team) ASSERT s.id IS UNIQUE`,
		`${verb} CONSTRAINT ON (s:Team) ASSERT exists(s.id)`
	];

	const setupConstraintIfPossible = constraintQuery =>
		db.run(constraintQuery).catch(err => {
			console.log(err);
			return Promise.resolve();
		});
	const constraints = await Promise.all(
		constraintQueries.map(setupConstraintIfPossible)
	).then(() => db.run('CALL db.constraints'));

	console.log('CALL db.constraints ok?', verb, constraints.records.length);
};

const dropNodes = async nodeTypes => {
	console.log(`dropping nodes ${nodeTypes.join(' ')}...`);
	return await Promise.all(
		nodeTypes.map(nodeType => db.run(`MATCH (a:${nodeType}) DELETE a`))
	);
};

const dropRelationships = async () => {
	console.log('dropping relationships...');
	const relationships = [
		'o:OWNEDBY',
		'o:ASKS',
		'o:RAISES',
		'o:ALLOWS',
		'o:SIGNS',
		'o:SUBMITS',
		'o:ANSWERS',
		'o:ANSWERS_QUESTION',
		'o:HAS'
	];

	return Promise.all(
		relationships.map(relationship =>
			db.run(`MATCH ()-[${relationship}]->() DELETE o`)
		)
	);
};

const init = async () => {
	if (process.env.NODE_ENV !== 'production') {
		// DROP
		await constraints('DROP');
		await dropRelationships();
		await dropNodes(nodeTypes);

		// CREATE
		await constraints('CREATE');
		await createSurveys(db);
	}
};

const initMiddleware = async (req, res) => {
	await init();

	res.send(200, 'OK');
};

if (process.argv[1] === __filename) {
	init()
		.then(() => {
			console.log('Completed init');
			process.exit(0);
		})
		.catch(error => {
			console.error('Init failed, ', error);
			process.exit(1);
		});
}

module.exports = initMiddleware;
