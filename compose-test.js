const schema = require('@financial-times/tc-schema-sdk');


void async function () {
	schema.init()
	await schema.ready();
	console.log(schema.getGraphqlDefs())
}()
