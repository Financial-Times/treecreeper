const neo4j = require('neo4j-driver').v1;

const driver = neo4j.driver(process.env.NEO_URI, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASSWORD));
module.exports = driver.session();
