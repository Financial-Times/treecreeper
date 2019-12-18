const primitives = require('./primitives/server');

const { componentAssigner, graphqlQueryBuilder } = require('./lib/mappers');
const { ApiClient } = require('./lib/api-client');
const { getSchemaSubset } = require('./lib/get-schema-subset');
const { getDataTransformers } = require('./lib/get-data-transformers');
const { getPageRenderer, FormError } = require('./page');
const {
	getViewHandler,
	getEditHandler,
	getDeleteHandler,
} = require('./handlers');
const messages = require('./components/messages');

const getCMS = ({
	logger,
	apiBaseUrl,
	apiHeaders,
	Header,
	Footer,
	customComponents,
	customTypeMappings,
}) => {
	const assignComponent = componentAssigner({
		customComponents,
		customTypeMappings,
	});

	const graphqlBuilder = type => graphqlQueryBuilder(type, assignComponent);

	const { handleError, renderPage } = getPageRenderer({
		Header,
		Footer,
	});

	const getApiClient = event =>
		new ApiClient({
			event,
			graphqlBuilder,
			logger,
			apiBaseUrl,
			apiHeaders,
		});

	const { formDataToRest, formDataToGraphQL } = getDataTransformers(
		assignComponent,
	);
	const { handler: viewHandler, render: viewRender } = getViewHandler({
		getApiClient,
		getSchemaSubset,
		handleError,
		assignComponent,
		renderPage,
	});
	return {
		view: viewHandler,
		edit: getEditHandler({
			getApiClient,
			getSchemaSubset,
			handleError,
			renderPage,
			assignComponent,
			formDataToRest,
			formDataToGraphQL,
		}).handler,
		delete: getDeleteHandler({
			getApiClient,
			handleError,
			viewRender,
			logger,
		}).handler,
	};
};

module.exports = {
	primitives,
	componentAssigner,
	graphqlQueryBuilder,
	ApiClient,
	getSchemaSubset,
	getPageRenderer,
	FormError,
	getDataTransformers,
	components: { ...messages },
	getCMS,
};

/*
init ({
	apiBaseUrl,
	apiHeaders,
	customComponents = {},
	customTypeMappings = {},
})



*/
