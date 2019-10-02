#!/usr/bin/env node

const logger = require('@financial-times/n-logger').default;
const schema = require('../../packages/schema-sdk');
const {
	executeQueryWithSharedSession,
} = require('../../packages/api-core/lib/db-connection');

const exclusion = (arr1, arr2) => arr1.filter(val => !arr2.includes(val));

const initConstraints = async () => {
	await schema.ready();
	const executeQuery = executeQueryWithSharedSession();

	try {
		const setupConstraintIfPossible = constraintQuery =>
			executeQuery(constraintQuery).catch(err =>
				logger.warn({
					event: 'CONSTRAINT_SETUP_FAILURE',
					err: err.message,
					constraintQuery,
				}),
			);

		const retrieveConstraints = async () => {
			const constraints = await executeQuery('CALL db.constraints');
			return constraints.records.map(constraint =>
				constraint.get('description'),
			);
		};

		const existingConstraints = await retrieveConstraints();
		const desiredConstraints = []
			.concat(
				...schema.getTypes().map(({ name: typeName, properties }) => {
					return [].concat(
						...Object.entries(properties).map(
							([propName, { unique }]) => {
								return [
									unique &&
										`CONSTRAINT ON (s:${typeName}) ASSERT s.${propName} IS UNIQUE`,
									// skip the setting of enterprise version specific constraints until we use the enterprise version
									// required &&
									// 	`CONSTRAINT ON (s:${typeName}) ASSERT exists(s.${propName})`
								];
							},
						),
					);
				}),
			)
			.filter(statement => !!statement);

		const createConstraints = exclusion(
			desiredConstraints,
			existingConstraints,
		).map(constraint => `CREATE ${constraint}`);

		for (const constraint of createConstraints) {
			await setupConstraintIfPossible(constraint); // eslint-disable-line no-await-in-loop
		}

		const constraints = await retrieveConstraints();

		logger.info(
			`db.constraints updated. ${constraints.length} constraints exist`,
		);
	} finally {
		executeQuery.close();
	}
};

module.exports = {
	initConstraints,
	listenForChanges: () => schema.on('change', initConstraints),
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
