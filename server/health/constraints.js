const neo4j = require('neo4j-driver').v1;
const logger = require('@financial-times/n-logger');
const fetch = require('isomorphic-fetch');
const { stripIndents } = require('common-tags');
const readYaml = require('../../schema/lib/read-yaml');
const typesSchema = readYaml.directory('./schema/types');

const missingUniqueConstraints = [];
const missingPropertyConstraints = [];

const FIVE_MINUTES = 5 * 60 * 1000;

let lastCheckOk;
let lastCheckOutput;
let panicGuide;
let lastCheckTime;

const constraintsCheck = async () => {
	const currentDate = new Date().toUTCString();

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
			lastCheckOk = false;
			lastCheckTime = currentDate;
			lastCheckOutput =
				'Error retrieving database constraints: no constraints found!';
			panicGuide = 'Create all constraints!';
			return;
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
			lastCheckOk = true;
			lastCheckTime = currentDate;
			lastCheckOutput = 'Successfully retrieved all database constraints';
			panicGuide = "Don't panic";
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

				lastCheckOk = false;
				lastCheckTime = currentDate;
				lastCheckOutput = stripIndents`Database is missing required constraints`;
				panicGuide = stripIndents`Go via the biz-ops-api dashboard on heroku https://dashboard.heroku.com/apps/biz-ops-api/resources
						to the grapheneDB instance. Launch the Neo4j browser and run the following queries ${uniqueConstraintQueries} ${propertyConstraintQueries}`;
			}
		}
	} catch (err) {
		logger.error(
			{
				event: 'BIZ_OPS_HEALTHCHECK_CONSTRAINTS_FAILURE',
				err
			},
			'Healthcheck failed'
		);
		lastCheckOk = false;
		lastCheckTime = currentDate;
		lastCheckOutput = stripIndents`Error retrieving database constraints: ${
			err.message ? err.message : err
		}`;
		panicGuide =
			'Please check the logs in splunk using the following: `source="/var/log/apps/heroku/ft-biz-ops-api.log" event="BIZ_OPS_HEALTHCHECK_CONSTRAINTS_FAILURE"`';
	}
};

constraintsCheck();

setInterval(async () => {
	await constraintsCheck();
}, FIVE_MINUTES).unref();

module.exports = {
	getStatus: () => {
		return {
			ok: lastCheckOk,
			checkOutput: lastCheckOutput,
			lastUpdated: lastCheckTime,
			businessImpact: 'Biz-Ops API may contain duplicated data',
			severity: '2',
			technicalSummary:
				'Makes an API call which checks that all the required constraints exist.',
			panicGuide: panicGuide,
			_dependencies: ['grapheneDB']
		};
	}
};
