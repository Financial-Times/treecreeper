const neo4j = require('neo4j-driver').v1;
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

const isUnique = (actualConstraint, type) => {
	return (
		actualConstraint.type === 'UNIQUENESS' &&
		actualConstraint.property_keys[0] === 'code' &&
		type.properties.code.unique === true
	);
};

const codePropertyExists = (actualConstraint, type) => {
	return (
		actualConstraint.type === 'NODE_PROPERTY_EXISTENCE' &&
		type.properties.code.required === true
	);
};

const constraintsCheck = async () => {
	const currentDate = new Date();

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

		const responseJson = await response.json();

		if (!responseJson.length) {
			lastCheckOk = false;
			lastCheckTime = currentDate;
			lastCheckOutput =
				'Error retrieving database constraints: no constraints found!';
			panicGuide = 'Create all constraints!';
			return;
		} else {
			responseJson.map(actualConstraint => {
				typesSchema.map(type => {
					if (type.name === actualConstraint.label) {
						if (
							!isUnique(actualConstraint, type) &&
							actualConstraint.type !== 'NODE_PROPERTY_EXISTENCE'
						) {
							missingUniqueConstraints.push({
								label: actualConstraint.label
							});
						}
						if (
							!codePropertyExists(actualConstraint, type) &&
							actualConstraint.type !== 'UNIQUENESS'
						) {
							missingPropertyConstraints.push({
								label: actualConstraint.label,
								type: actualConstraint.type
							});
						}
					}
				});
			});

			if (missingUniqueConstraints.length > 0) {
				lastCheckOk = false;
				lastCheckTime = currentDate;
				lastCheckOutput = stripIndents`Database is missing unique constraints for:
								 ${missingUniqueConstraints}`;
				panicGuide = missingUniqueConstraints.map(missingConstraint => {
					return stripIndents`Go via the biz-ops-api dashboard on heroku https://dashboard.heroku.com/apps/biz-ops-api/resources
						to the grapheneDB instance. Launch the Neo4j browser and run CREATE CONSTRAINT ON ( n:${
							missingConstraint.label
						} ) ASSERT n.code IS UNIQUE`;
				});
			}

			if (missingPropertyConstraints.length > 0) {
				lastCheckOk = false;
				lastCheckTime = currentDate;
				lastCheckOutput = stripIndents`Database is missing the following property constraints:
								 ${missingPropertyConstraints}`;
				panicGuide = missingPropertyConstraints.map(missingConstraint => {
					return stripIndents`Go via the biz-ops-api dashboard on heroku https://dashboard.heroku.com/apps/biz-ops-api/resources
						to the grapheneDB instance. Launch the Neo4j browser and run CREATE CONSTRAINT ON ( n:${
							missingConstraint.label
						} ) ASSERT exists(n.code)`;
				});
			}
		}

		lastCheckOk = 'true';
		lastCheckTime = currentDate;
		lastCheckOutput = 'Successfully retrieved database constraints';
		panicGuide = "Don't panic";
	} catch (err) {
		lastCheckOk = false;
		lastCheckTime = currentDate;
		lastCheckOutput = stripIndents`Error retrieving database constraints: ${
			err.message ? err.message : err
		}`;
		panicGuide = '';
	}
};

constraintsCheck();
setInterval(constraintsCheck, FIVE_MINUTES);

module.exports = {
	getStatus: () => {
		return {
			name: 'Biz-Ops API schema (v1)',
			description:
				'Checks to make sure that the correct constraints exist in the database',
			checks: [
				{
					ok: lastCheckOk,
					checkOutput: lastCheckOutput,
					lastUpdated: lastCheckTime,
					panicGuide: panicGuide,

					severity: '',
					businessImpact: 'Biz-Ops API may contain duplicated data',
					technicalSummary:
						'Makes an API call which checks that all the required constraints exist.'
				}
			]
		};
	}
};
