const schema = require('../../../packages/schema-sdk');

schema.init({
	schemaDirectory: process.env.TREECREEPER_SCHEMA_DIRECTORY,
});

module.exports = {
	schemaReady: schema.ready(),
};
