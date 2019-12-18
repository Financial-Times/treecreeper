const logger = require('@financial-times/lambda-logger');
const {
	componentAssigner,
	graphqlQueryBuilder,
	ApiClient,
	getSchemaSubset,
	getPageRenderer,
	getDataTransformers,
} = require('@financial-times/tc-ui');
const { getViewHandler } = require('./view');
const { getEditHandler } = require('./edit');
const { getDeleteHandler } = require('./delete');

const { Header } = require('./lib/components/header');
const { Footer } = require('./lib/components/footer');

const customComponents = require('./lib/components/primitives');

const getApi = ({
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
		renderPage,
	});
	return {
		view: viewHandler,
		edit: getEditHandler({
			getApiClient,
			getSchemaSubset,
			handleError,
			renderPage,
			formDataToRest,
			formDataToGraphQL,
		}).handler,
		delete: getDeleteHandler({
			getApiClient,
			handleError,
			viewRender,
		}).handler,
	};
};

module.exports = getApi({
	logger,
	apiBaseUrl: 'http://local.in.ft.com:8888/api',
	apiHeaders: () => ({
		'x-api-key': process.env.BIZ_OPS_API_KEY,
		'client-id': 'biz-ops-admin',
		'client-user-id': 'rhys.evans',
	}),
	Header,
	Footer,
	customComponents,
	customTypeMappings: {
		Paragraph: 'LargeText',
	},
});
