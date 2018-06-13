const { session: db } = require('../server/db-connection');

const { typesSchema } = require('../schema');

const constraints = async verb => {
	console.log(`Running ${verb} constraints...`);

	const constraintQueries = []
		.concat(
			...typesSchema.map(({ name: typeName, properties }) => {
				return [].concat(
					...Object.entries(properties).map(
						([propName, { required, unique }]) => {
							return [
								unique &&
									`${verb} CONSTRAINT ON (s:${typeName}) ASSERT s.${propName} IS UNIQUE`,
								required &&
									`${verb} CONSTRAINT ON (s:${typeName}) ASSERT exists(s.${propName})`
							];
						}
					)
				);
			})
		)
		.filter(query => !!query);

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

const dropNodes = async () => {
	const nodeTypes = typesSchema.map(type => type.name);

	console.log(`dropping nodes ${nodeTypes.join(' ')}...`);

	return await Promise.all(
		nodeTypes.map(nodeType => db.run(`MATCH (a:${nodeType}) DETACH DELETE a`))
	);
};

const init = async () => {
	if (process.env.NODE_ENV !== 'production') {
		// DROP
		await constraints('DROP');
		await dropNodes();
	}

	// CREATE
	await constraints('CREATE');
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
