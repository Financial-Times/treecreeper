const response = require('./lib/response');

const { readRecord } = require('./lib/biz-ops-client');

const getSchemaSubset = require('./lib/get-schema-subset');
const template = require('./templates/view-page');

const { handleError } = require('./lib/handle-error');

const render = async (event, { type, code, error }) => {
	const data = await readRecord(type, code, event.username);
	const schema = getSchemaSubset(event, type, false);
	return response.page(
		template,
		{
			schema,
			data,
			error,
			pageType: 'view',
			pageTitle: `View ${type} ${data.name}`,
		},
		event,
	);
};

exports.handler = handleError(event => {
	const { type, code } = event.params;
	return render(event, {
		type,
		code,
	});
});

exports.render = render;
