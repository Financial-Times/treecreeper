const logger = require('@financial-times/n-logger').default;
const { stripIndents } = require('common-tags');
const readYaml = require('../../schema/lib/read-yaml');
const typesSchema = readYaml.directory('./schema/types');
const healthcheck = require('./healthcheck');
const outputs = require('./output');
const { executeQuery } = require('../db-connection');

const constraintsCheck = async () => {
	//FIXME: Could this be done better using arr.reduce or map and filter
	const missingUniqueConstraints = [];
	const missingPropertyConstraints = [];

	try {
		const dbResults = await executeQuery(`CALL db.constraints`);
		const dbConstraints = dbResults.records;

		if (!dbConstraints) {
			return {
				lastCheckOk: false,
				lastCheckTime: new Date().toUTCString(),
				lastCheckOutput:
					'Error retrieving database constraints: no constraints found!',
				panicGuide: "Don't panic"
			};
		}

		typesSchema.map(type => {
			const node = type.name.toLowerCase();
			const uniqueConstraintQuery = `CONSTRAINT ON ( ${node}:${
				type.name
			} ) ASSERT ${node}.code IS UNIQUE`;

			const hasUniqueConstraint = actualConstraint => {
				return actualConstraint._fields[0] === uniqueConstraintQuery;
			};
			if (!dbConstraints.some(hasUniqueConstraint)) {
				missingUniqueConstraints.push({ name: type.name });
			}
			//TODO hasPropertyConstraint will need to be added back into the healthcheck if we get a license for Neo4j Enterprise
			// const propertyConstraintQuery = `CONSTRAINT ON ( ${node}:${
			// 	type.name
			// } ) ASSERT exists(${node}.code)`;
			// const hasPropertyConstraint = actualConstraint => {
			// 	return actualConstraint._fields[0] === propertyConstraintQuery;
			// };
			//
			// if (!dbConstraints.some(hasPropertyConstraint)) {
			// 	missingPropertyConstraints.push({ name: type.name });
			// }
		});

		if (
			missingUniqueConstraints.length === 0 &&
			missingPropertyConstraints.length === 0
		) {
			return {
				lastCheckOk: true,
				lastCheckTime: new Date().toUTCString(),
				lastCheckOutput: 'Successfully retrieved all database constraints',
				panicGuide: "Don't panic"
			};
		} else {
			if (
				missingUniqueConstraints.length > 0 ||
				missingPropertyConstraints.length > 0
			) {
				const uniqueConstraintQueries = missingUniqueConstraints.map(
					missingConstraint => {
						return stripIndents`CREATE CONSTRAINT ON ( n:${
							missingConstraint.name
						} ) ASSERT n.code IS UNIQUE`;
					}
				);

				const propertyConstraintQueries = missingPropertyConstraints.map(
					missingConstraint => {
						return stripIndents`CREATE CONSTRAINT ON ( n:${
							missingConstraint.name
						} ) ASSERT exists(n.code)`;
					}
				);
				logger.error(
					{
						event: 'BIZ_OPS_HEALTHCHECK_FAILURE',
						healthCheckName: 'CONSTRAINTS',
						uniqueConstraintQueries,
						propertyConstraintQueries
					},
					'Constraints healthcheck ok'
				);
				return {
					lastCheckOk: false,
					lastCheckTime: new Date().toUTCString(),
					lastCheckOutput: 'Database is missing required constraints',
					panicGuide: stripIndents`Go via the biz-ops-api dashboard on heroku https://dashboard.heroku.com/apps/biz-ops-api/resources
						to the grapheneDB instance. Launch the Neo4j browser and run the following queries ${uniqueConstraintQueries} ${propertyConstraintQueries}`
				};
			}
		}
	} catch (error) {
		logger.error(
			{
				event: 'BIZ_OPS_HEALTHCHECK_FAILURE',
				healthCheckName: 'CONSTRAINTS',
				error
			},
			'Healthcheck failed'
		);
		return {
			lastCheckOk: false,
			lastCheckTime: new Date().toUTCString(),
			lastCheckOutput: stripIndents`Error retrieving database constraints: ${
				error.message ? error.message : error
			}`,
			panicGuide:
				'Please check the logs in splunk using the following: `source="/var/log/apps/heroku/ft-biz-ops-api.log" event="BIZ_OPS_HEALTHCHECK_FAILURE" healthCheckName: "CONSTRAINTS"`'
		};
	}
};

module.exports = healthcheck(constraintsCheck, outputs.constraints);
