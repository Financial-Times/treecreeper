const {
	safeQueryWithSharedSession,
	safeQuery
} = require('../server/db-connection');
const { typesSchema } = require('../schema');
const logger = require('@financial-times/n-logger').default;

const constraints = async verb => {
	logger.info(`Running ${verb} constraints...`);

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

	const safeQuery = safeQueryWithSharedSession();

	const setupConstraintIfPossible = constraintQuery =>
		safeQuery(constraintQuery).catch(err => {
			logger.warn({ err: err.message, constraintQuery });
			return Promise.resolve();
		});

	for (const constraint of constraintQueries) {
		await setupConstraintIfPossible(constraint);
	}
	const constraints = await safeQuery('CALL db.constraints');

	logger.info('CALL db.constraints ok?', verb, constraints.records.length);
};

const dropNodes = async () => {
	const nodeTypes = typesSchema.map(type => type.name);

	logger.info(`dropping nodes ${nodeTypes.join(' ')}...`);

	return await Promise.all(
		nodeTypes.map(nodeType => {
			return safeQuery(`MATCH (a:${nodeType}) DETACH DELETE a`);
		})
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
			logger.info('Completed init');
			process.exit(0);
		})
		.catch(error => {
			logger.error('Init failed, ', error);
			process.exit(1);
		});
}

module.exports = initMiddleware;
