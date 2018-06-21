const { safeQueryWithSharedSession } = require('../server/db-connection');
const schemas = require('./index');
const logger = require('@financial-times/n-logger').default;

const exclusion = (arr1, arr2) => arr1.filter(val => !arr2.includes(val));

const initConstraints = async () => {
	const safeQuery = safeQueryWithSharedSession();

	try {
		const setupConstraintIfPossible = constraintQuery =>
			safeQuery(constraintQuery).catch(err =>
				logger.warn({
					event: 'CONSTRAINT_SETUP_FAILURE',
					err: err.message,
					constraintQuery
				})
			);

		const retrieveConstraints = async () => {
			const constraints = await safeQuery('CALL db.constraints');
			return constraints.records.map(constraint =>
				constraint.get('description')
			);
		};

		const existingConstraints = await retrieveConstraints();
		const desiredConstraints = []
			.concat(
				...schemas.typesSchema.map(({ name: typeName, properties }) => {
					return [].concat(
						...Object.entries(properties).map(
							([propName, { required, unique }]) => {
								return [
									unique &&
										`CONSTRAINT ON (s:${typeName}) ASSERT s.${propName} IS UNIQUE`,
									required &&
										`CONSTRAINT ON (s:${typeName}) ASSERT exists(s.${propName})`
								];
							}
						)
					);
				})
			)
			.filter(statement => !!statement);

		const dropConstraints = exclusion(
			existingConstraints,
			desiredConstraints
		).map(constraint => `DROP ${constraint}`);
		const createConstraints = exclusion(
			desiredConstraints,
			existingConstraints
		).map(constraint => `CREATE ${constraint}`);

		for (const constraint of dropConstraints.concat(createConstraints)) {
			await setupConstraintIfPossible(constraint);
		}

		const constraints = await retrieveConstraints();

		logger.info(
			`db.constraints updated. ${constraints.length} constraints exist`
		);
	} finally {
		safeQuery.close();
	}
};

module.exports = {
	initConstraints
};

if (process.argv[1] === __filename) {
	initConstraints()
		.then(() => {
			logger.info('Completed init');
			process.exit(0);
		})
		.catch(error => {
			logger.error('Init failed, ', error);
			process.exit(1);
		});
}
