const primitives = require('./primitives/server');
const { componentAssigner } = require('./lib/mappers/component-assigner');
const { graphqlQueryBuilder } = require('./lib/mappers/graphql-query-builder');
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
			clientId,
		});

	const { formDataToRest, formDataToGraphQL } = getDataTransformers(
		assignComponent,
		clientId,
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
			'o-layout': '^4.2.1',
			'o-message': '^4.2.4',
			'o-forms': '^8.4.2',
			'o-normalise': '^2.0.7',
			'o-buttons': '^6.2.0',
			'o-colors': '^5.3.1',
			'o-icons': '^6.2.1',
			'o-fonts': '^4.4.2',
			'o-expander': '^5.0.11',
			'o-tooltip': '^4.0.9',
		},
		js: {
			'o-layout': '^4.2.1',
			'o-expander': '^5.0.11',
			'o-tooltip': '^4.0.9',
			'o-date': '^4.1.2',
		},
	},
	getComponentAssigner: componentAssigner,
};
