const { getApiClient } = require('./lib/get-api-client');
const response = require('./lib/response');

const getSchemaSubset = require('./lib/get-schema-subset');
const template = require('./templates/view-page');
const { handleError } = require('./lib/handle-error');

const render = async event => {
	const { type, code } = event.params;
	const { error } = event;
	const apiClient = getApiClient(event);
	const data = await apiClient.read(type, code);

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

exports.handler = handleError(event => render(event));

exports.render = render;
