const { getApiClient } = require('./lib/tc-ui-bridge');

const getSchemaSubset = require('./lib/get-schema-subset');
const { getApiClient, getSchemaSubset } = require('./lib/tc-ui-bridge');
const template = require('./templates/view-page');
const { handleError, renderPage } = require('./lib/renderer');

const render = async event => {
	const { type, code } = event.params;
	const { error } = event;
	const apiClient = getApiClient(event);
	const data = await apiClient.read(type, code);

	const schema = getSchemaSubset(event, type);
	return renderPage(
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

exports.handler = handleError(render);

exports.render = render;
