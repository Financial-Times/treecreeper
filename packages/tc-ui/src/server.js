const primitives = require('./primitives/server');

const { componentAssigner, graphqlQueryBuilder } = require('./lib/mappers');
const { ApiClient } = require('./lib/api-client');
const { getSchemaSubset } = require('./lib/get-schema-subset');
const { getDataTransformers } = require('./lib/get-data-transformers');
const { getPageRenderer } = require('./render');
const {
	getViewHandler,
	getEditHandler,
	getDeleteHandler,
} = require('./pages/server');

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
	assetManifest,
	assetRoot,
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
		assetManifest,
		assetRoot,
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
		handleError,
		renderPage,
	};
};

module.exports = {
	primitives,
	getCMS,
};
