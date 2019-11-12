/* eslint-disable import/no-extraneous-dependencies */
const neo4j = require('neo4j-driver').v1;
/* eslint-enable import/no-extraneous-dependencies */

const driver = neo4j.driver(
	process.env.NEO4J_BOLT_URL,
	neo4j.auth.basic(
		process.env.NEO4J_BOLT_USER,
		process.env.NEO4J_BOLT_PASSWORD,
	),
	{ disableLosslessIntegers: true },
);

module.exports = {
	driver,
};