const neo4j = require('neo4j-driver').v1;

const driver = neo4j.driver(
	process.env.NEO4J_BOLT_URL || 'bolt://localhost:7687',
	neo4j.auth.basic(
		process.env.NEO4J_BOLT_USER,
		process.env.NEO4J_BOLT_PASSWORD,
	),
	{ disableLosslessIntegers: true },
);

module.exports = {
	driver,
};
