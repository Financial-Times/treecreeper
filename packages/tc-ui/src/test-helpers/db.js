const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
	process.env.NEO4J_BOLT_URL || 'bolt://localhost:7687',
	neo4j.auth.basic(
		process.env.NEO4J_BOLT_USER,
		process.env.NEO4J_BOLT_PASSWORD,
	),
	{ disableLosslessIntegers: true },
);

const executeQuery = (query, parameters) =>
	driver.session().run(query, parameters);

const dropFixtures = namespace =>
	executeQuery(
		`MATCH (n) WHERE n.code STARTS WITH "${namespace}" DETACH DELETE n`,
	);


module.exports = { executeQuery, dropFixtures };
