const schema = require('../../../packages/schema-sdk');
const { logger } = require('./request-context');

schema.init({
	schemaDirectory: process.env.TREECREEPER_SCHEMA_DIRECTORY,
});

module.exports = {
	schemaReady: schema.ready(),
};
