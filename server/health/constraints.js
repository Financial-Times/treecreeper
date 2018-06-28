const neo4j = require('neo4j-driver').v1;
const logger = require('@financial-times/n-logger').default;
const fetch = require('isomorphic-fetch');
const { stripIndents } = require('common-tags');
const readYaml = require('../../schema/lib/read-yaml');
const typesSchema = readYaml.directory('./schema/types');
const healthcheck = require('./healthcheck');
const outputs = require('./output');

const missingUniqueConstraints = [];
const missingPropertyConstraints = [];

const constraintsCheck = async () => {
	try {
		const response = await fetch(
			`http://localhost:7474/db/data/schema/constraint`,
			{
				method: 'GET',
				Authorization: neo4j.auth.basic(
					process.env.GRAPHENEDB_CHARCOAL_BOLT_USER,
					process.env.GRAPHENEDB_CHARCOAL_BOLT_PASSWORD
				)
			}
		);

		const dbConstraints = await response.json();

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
			if (type.properties.code.unique === true) {
				const uniqueConstraint = dbConstraints.filter(
					actualConstraint =>
						actualConstraint.label === type.name &&
						actualConstraint.type === 'UNIQUENESS'
				);

				if (uniqueConstraint.length === 0) {
					missingUniqueConstraints.push({
						name: type.name
					});
				}
			}
			if (type.properties.code.required === true) {
				const propertyConstraint = dbConstraints.filter(
					actualConstraint =>
						actualConstraint.label === type.name &&
						actualConstraint.type === 'NODE_PROPERTY_EXISTENCE'
				);
				if (propertyConstraint.length === 0) {
					missingPropertyConstraints.push({
						name: type.name
					});
				}
			}
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
				return {
					lastCheckOk: false,
					lastCheckTime: new Date().toUTCString(),
					lastCheckOutput: stripIndents`Database is missing required constraints`,
					panicGuide: stripIndents`Go via the biz-ops-api dashboard on heroku https://dashboard.heroku.com/apps/biz-ops-api/resources
						to the grapheneDB instance. Launch the Neo4j browser and run the following queries ${uniqueConstraintQueries} ${propertyConstraintQueries}`
				};
			}
		}
	} catch (err) {
		logger.error(
			{
				event: 'BIZ_OPS_HEALTHCHECK_FAILURE',
				healthCheckName: 'CONSTRAINTS',
				err
			},
			'Healthcheck failed'
		);
		return {
			lastCheckOk: false,
			lastCheckTime: new Date().toUTCString(),
			lastCheckOutput: stripIndents`Error retrieving database constraints: ${
				err.message ? err.message : err
			}`,
			panicGuide:
				'Please check the logs in splunk using the following: `source="/var/log/apps/heroku/ft-biz-ops-api.log" event="BIZ_OPS_HEALTHCHECK_FAILURE" healthCheckName: "CONSTRAINTS"`'
		};
	}
};

module.exports = healthcheck(constraintsCheck, outputs.constraints);
