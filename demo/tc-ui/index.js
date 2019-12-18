const logger = require('@financial-times/lambda-logger');
const { getCMS } = require('@financial-times/tc-ui');

const { Header } = require('./lib/components/header');
const { Footer } = require('./lib/components/footer');

const customComponents = require('./lib/components/primitives');

module.exports = getCMS({
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
