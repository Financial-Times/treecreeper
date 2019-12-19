const primitives = require('./primitives/server');

const { componentAssigner, graphqlQueryBuilder } = require('./lib/mappers');
const { ApiClient } = require('./lib/api-client');
const { getSchemaSubset } = require('./lib/get-schema-subset');
const { getDataTransformers } = require('./lib/get-data-transformers');
const { getPageRenderer } = require('./page');
const {
	getViewHandler,
	getEditHandler,
	getDeleteHandler,
} = require('./handlers');

const getCMS = ({
	logger,
	restApiUrl,
	graphqlApiUrl,
	apiHeaders,
	Header,
	Footer,
	Subheader,
	origamiCssModules,
	origamiJsModules,
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
		origamiCssModules,
		origamiJsModules,
	});

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
};
