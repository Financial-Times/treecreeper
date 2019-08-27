const schema = require('../../../packages/schema-sdk');

schema.init({ updateMode: 'poll' });

module.exports = {
	schemaReady: schema.ready(),
};
