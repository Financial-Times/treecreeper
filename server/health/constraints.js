const { stripIndents } = require('common-tags');
const { getTypes } = require('@financial-times/biz-ops-schema');
const { logger } = require('../lib/request-context');
const healthcheck = require('./healthcheck');
const { executeQuery } = require('../data/db-connection');

const constraintsCheck = async () => {
	// FIXME: Could this be done better using arr.reduce or map and filter
	const missingUniqueConstraints = [];
	const missingPropertyConstraints = [];

	try {
		const dbResults = await executeQuery(`CALL db.constraints`);
		const dbConstraints = dbResults.records;

		if (!dbConstraints) {
			return {
				ok: false,
				lastUpdated: new Date().toUTCString(),
				checkOutput:
					'Error retrieving database constraints: no constraints found!',
				panicGuide:
					'Investigate whether a recent change has been made to the Neo4j database, or biz-ops schema.  It may be neccessary to restore from a backup if data has been lost from the database.',
			};
		}

		getTypes().forEach(type => {
			const node = type.name.toLowerCase();
			const uniqueConstraintQuery = `CONSTRAINT ON ( ${node}:${
				type.name
			} ) ASSERT ${node}.code IS UNIQUE`;

			const hasUniqueConstraint = actualConstraint =>
				actualConstraint._fields[0] === uniqueConstraintQuery;

			if (!dbConstraints.some(hasUniqueConstraint)) {
				missingUniqueConstraints.push({ name: type.name });
			}
			// TODO hasPropertyConstraint will need to be added back into the healthcheck if we get a license for Neo4j Enterprise
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
				ok: true,
				lastUpdated: new Date().toUTCString(),
				checkOutput: 'Successfully retrieved all database constraints',
				panicGuide:
					"This panic guide is dynamically generated based on the type of error returned from the database.\nIf you're seeing this message in combination with an alert, check the /__health endpoint directly on the biz-ops-api backend.",
			};
		}
		if (
			missingUniqueConstraints.length > 0 ||
			missingPropertyConstraints.length > 0
		) {
			const uniqueConstraintQueries = missingUniqueConstraints.map(
				missingConstraint => {
					return stripIndents`CREATE CONSTRAINT ON ( n:${
						missingConstraint.name
					} ) ASSERT n.code IS UNIQUE`;
				},
			);

			const propertyConstraintQueries = missingPropertyConstraints.map(
				missingConstraint => {
					return stripIndents`CREATE CONSTRAINT ON ( n:${
						missingConstraint.name
					} ) ASSERT exists(n.code)`;
				},
			);
			logger.error(
				{
					event: 'BIZ_OPS_HEALTHCHECK_FAILURE',
					healthCheckName: 'CONSTRAINTS',
					uniqueConstraintQueries,
					propertyConstraintQueries,
				},
				'Constraints healthcheck ok',
			);
			return {
				ok: false,
				lastUpdated: new Date().toUTCString(),
				checkOutput: 'Database is missing required constraints',
				panicGuide: stripIndents`Go via the biz-ops-api dashboard on heroku https://dashboard.heroku.com/apps/biz-ops-api/resources
						to the grapheneDB instance. Launch the Neo4j browser and run the following queries ${uniqueConstraintQueries
							.concat(propertyConstraintQueries)
							.join(', ')}.
						Note that each query must be run separately`,
			};
		}
	} catch (error) {
		logger.error(
			{
				event: 'BIZ_OPS_HEALTHCHECK_FAILURE',
				healthCheckName: 'CONSTRAINTS',
				error,
			},
			'Healthcheck failed',
		);
		return {
			ok: false,
			lastUpdated: new Date().toUTCString(),
			checkOutput: stripIndents`Error retrieving database constraints: ${
				error.message ? error.message : error
			}`,
			panicGuide:
				'First look at the `Biz-Ops API read query` check.  If that is also erroring (or has been recently) ignore this check and focus on that one.\n Otherwise, check the logs in splunk using the following: `index=heroku source="/var/log/apps/heroku/ft-biz-ops-api.log" event="BIZ_OPS_HEALTHCHECK_FAILURE" healthCheckName="CONSTRAINTS"`',
		};
	}
};

module.exports = healthcheck(constraintsCheck, 'constraints');
