const schema = require('../../../packages/treecreeper-schema-sdk');

schema.init({ updateMode: 'poll' });

module.exports = {
	schemaReady: schema.ready(),
};
