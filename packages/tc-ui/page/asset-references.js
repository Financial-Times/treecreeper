// locally webpack manifest is not created
const getWebpackManifest = isProduction =>
	isProduction
		? // built resource, so doesn't exist in local dev
		  // eslint-disable-next-line import/no-unresolved
		  require('../../browser/manifest.json') // eslint-disable-line global-require
		: {
				'main.css': 'main.css',
				'main.js': 'main.js',
		  };

// TODO serve as /statics in prod
const getPathToStaticAsset = (isProduction, fileName) =>
	`${
		isProduction
			? `https://s3-eu-west-1.amazonaws.com/biz-ops-statics.${process.env.AWS_ACCOUNT_ID}/biz-ops-admin`
			: 'http://local.in.ft.com:8080/statics'
	}/${getWebpackManifest(isProduction)[fileName]}`;

const buildServiceBaseUrl =
	'https://www.ft.com/__origami/service/build/v2/bundles';

const buildOrigamiUrl = (isProduction, type, map) =>
	`${buildServiceBaseUrl}/${type}?brand=internal&modules=${Object.entries(map)
		.map(([key, val]) => `o-${key}@${val}`)
		.join(',')}${isProduction ? '' : '&minify=none'}`;

const defaultOrigamiCssModules = {
	layout: '^3.3.1',
	'header-services': '^3.2.3',
	table: '^7.0.5',
	message: '^3.0.0',
	forms: '^7.0.0',
	normalise: '^1.6.2',
	buttons: '^5.15.1',
	colors: '^4.7.8',
	icons: '^5.9.0',
	fonts: '^3.1.1',
	labels: '^4.1.1',
	expander: '^4.4.4',
	tooltip: '^3.4.0',
	'footer-services': '^2.1.0',
};

const defaultOrigamiJsModules = {
	layout: '^3.3.1',
	table: '^7.0.5',
	'header-services': '^3.2.3',
	expander: '^4.4.4',
	tooltip: '^3.4.0',
	date: '^2.11.0',
};

const getAssetReferences = ({
	isProduction,
	origamiJsModules = {},
	origamiCssModules = {},
}) => {
	return {
		origamiJs: buildOrigamiUrl(isProduction, 'js', {
			...origamiJsModules,
			...defaultOrigamiJsModules,
		}),
		origamiCss: buildOrigamiUrl(isProduction, 'css', {
			...origamiCssModules,
			...defaultOrigamiCssModules,
		}),
		mainJs: getPathToStaticAsset(isProduction, 'main.js'),
		mainCss: getPathToStaticAsset(isProduction, 'main.css'),
	};
};

module.exports = {
	getAssetReferences,
};
