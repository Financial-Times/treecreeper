const schema = require('@financial-times/tc-schema-sdk');

schema.init({ updateMode: 'poll' });

module.exports = {
	schemaReady: schema.ready(),
};
