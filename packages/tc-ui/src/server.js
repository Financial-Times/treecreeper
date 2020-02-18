const primitives = require('./primitives/server');

const { componentAssigner, graphqlQueryBuilder } = require('./lib/mappers');
const { ApiClient } = require('./lib/api-client');
const { getSchemaSubset } = require('./lib/get-schema-subset');
const { getDataTransformers } = require('./lib/get-data-transformers');
const {
	getViewHandler,
	getEditHandler,
	getDeleteHandler,
} = require('./pages/server');

const getCMS = ({
	logger,
	restApiUrl,
	graphqlApiUrl,
	clientId,
	apiHeaders,
	Subheader,
	customComponents,
	customTypeMappings,
	handleError,
	renderPage,
}) => {
	const assignComponent = componentAssigner({
		customComponents,
		customTypeMappings,
	});

	const graphqlBuilder = type => graphqlQueryBuilder(type, assignComponent);

	const getApiClient = event =>
		new ApiClient({
			event,
			graphqlBuilder,
			logger,
			restApiUrl,
			graphqlApiUrl,
			apiHeaders,
		});

	const { formDataToRest, formDataToGraphQL } = getDataTransformers(
		assignComponent,
		clientId
	);
	const { handler: viewHandler, render: viewRender } = getViewHandler({
		getApiClient,
		getSchemaSubset,
		Subheader,
		handleError,
		assignComponent,
		renderPage,
	});
	return {
		viewHandler,
		editHandler: getEditHandler({
			getApiClient,
			getSchemaSubset,
			handleError,
			renderPage,
			assignComponent,
			formDataToRest,
			formDataToGraphQL,
		}).handler,
		deleteHandler: getDeleteHandler({
			getApiClient,
			handleError,
			viewRender,
			logger,
		}).handler,
	};
};

module.exports = {
	primitives,
	getCMS,
	origamiModules: {
		css: {
			'o-layout': '^3.3.1',
			'o-message': '^3.0.0',
			'o-forms': '^7.0.0',
			'o-normalise': '^1.6.2',
			'o-buttons': '^5.15.1',
			'o-colors': '^4.7.8',
			'o-icons': '^5.9.0',
			'o-fonts': '^3.1.1',
			'o-expander': '^4.4.4',
			'o-tooltip': '^3.4.0',
		},
		js: {
			'o-layout': '^3.3.1',
			'o-expander': '^4.4.4',
			'o-tooltip': '^3.4.0',
			'o-date': '^2.11.0',
		},
	},
	getComponentAssigner: componentAssigner,
};
