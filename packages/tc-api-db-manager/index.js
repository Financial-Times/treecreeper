#!/usr/bin/env node

const logger = require('@financial-times/n-logger').default;
const schema = require('@financial-times/tc-schema-sdk');
const dbConnection = require('./db-connection');

const exclusion = (arr1, arr2) => arr1.filter(val => !arr2.includes(val));

const initConstraints = async () => {
	await schema.ready();
	const executeQuery = dbConnection.executeQueryWithSharedSession();

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

		const retrieveIndexes = async () => {
			const indexes = await executeQuery('CALL db.indexes');
			return indexes.records.map(constraint =>
				constraint.get('description'),
			);
		};

		const existingConstraints = await retrieveConstraints();
		const existingIndexes = await retrieveIndexes();
		const existingConstraintsAndIndexes = [
			...existingConstraints,
			...existingIndexes,
		];

		const desiredConstraintsAndIndexes = schema
			.getTypes()
			.flatMap(({ name: typeName, properties }) => {
				return Object.entries(properties).flatMap(
					([propName, { unique, canIdentify }]) => {
						if (unique) {
							return [
								`CONSTRAINT ON ( ${typeName.toLowerCase()}:${typeName} ) ASSERT ${typeName.toLowerCase()}.${propName} IS UNIQUE`,
							];
							// skip the setting of enterprise version specific constraints until we use the enterprise version
							// 	// required &&
							// 	// 	`CONSTRAINT ON (s:${typeName}) ASSERT exists(s.${propName})`
							// ];
						}
						if (canIdentify) {
							return [`INDEX ON :${typeName}(${propName})`];
						}
						return [];
					},
				);
			})
			.filter(statement => !!statement);

		const createConstraints = exclusion(
			desiredConstraintsAndIndexes,
			existingConstraintsAndIndexes,
		).map(constraint => `CREATE ${constraint}`);

		for (const constraint of createConstraints) {
			await setupConstraintIfPossible(constraint); // eslint-disable-line no-await-in-loop
		}

		const constraints = await retrieveConstraints();
		const indexes = await retrieveIndexes();

		logger.info(
			`db.constraints updated. ${constraints.length} constraints exist`,
		);
		logger.info(`db.indexes updated. ${indexes.length} indexes exist`);
	} finally {
		executeQuery.close();
	}
};

module.exports = {
	initConstraints,
	listenForSchemaChanges: () => schema.onChange(initConstraints),
	...dbConnection,
};

if (process.argv[1] === __filename) {
	schema.init();
	initConstraints()
		.then(() => {
			logger.info('Completed init');
			process.exit(0);
		})
		.catch(error => {
			logger.error('DB init failed', error);
			process.exit(1);
		});
}
