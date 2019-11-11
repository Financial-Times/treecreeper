const schema = require('../../../packages/tc-schema-sdk');

schema.init({ updateMode: 'poll' });

module.exports = {
	schemaReady: schema.ready(),
};
