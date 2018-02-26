const db = require('../server/db-connection');
const nodeTypes = require('../server/lib/checks').nodeTypes;
const createSurveys = require('./surveys/create');

const constraints = async (verb) => {
	console.log(`${verb.toLowerCase()}ing constraints...`);

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

	const setupConstraintIfPossible = (constraintQuery) => db.run(constraintQuery).catch(() => Promise.resolve());
	const constraints = await Promise.all(
		constraintQueries.map(setupConstraintIfPossible)
	).then(() => db.run('CALL db.constraints'));

	console.log('CALL db.constraints ok?', verb, constraints.records.length);
};

const dropNodes = async (nodeTypes) => {
	console.log(`dropping nodes ${nodeTypes.join(' ')}...`);
	return await Promise.all(nodeTypes.map(nodeType => db.run(`MATCH (a:${nodeType}) DELETE a`)));
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

	return Promise.all(relationships.map(
		relationship => db.run(`MATCH ()-[${relationship}]->() DELETE o`)
	));
};

const init = async (req, res) => {
	if (process.env.NODE_ENV !== 'production') {
		// DROP
		await constraints('DROP');
		await dropRelationships();
		await dropNodes(nodeTypes);

		// CREATE
		await constraints('CREATE');
		await createSurveys(db);
		res.send(200,'OK');
	}
};

if (process.argv[1] === __filename) {
	init({}, { send: (code, result) => {
		console.log(result);
		process.exit(0);
	}});
}

module.exports = init;
