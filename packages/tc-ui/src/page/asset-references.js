// TODO serve as /statics in prod
const getPathToStaticAsset = (isProduction, manifest, fileName) =>
	`${
		isProduction
			? `https://s3-eu-west-1.amazonaws.com/biz-ops-statics.${process.env.AWS_ACCOUNT_ID}/biz-ops-admin`
			: 'http://local.in.ft.com:8080/statics'
	}/${manifest[fileName]}`;

const buildServiceBaseUrl =
	'https://www.ft.com/__origami/service/build/v2/bundles';

const buildOrigamiUrl = (isProduction, type, map) =>
	`${buildServiceBaseUrl}/${type}?brand=internal&modules=${Object.entries(map)
		.map(([key, val]) => `o-${key}@${val}`)
		.join(',')}${isProduction ? '' : '&minify=none'}`;

const defaultOrigamiCssModules = {
	layout: '^3.3.1',
	message: '^3.0.0',
	forms: '^7.0.0',
	normalise: '^1.6.2',
	buttons: '^5.15.1',
	colors: '^4.7.8',
	icons: '^5.9.0',
	fonts: '^3.1.1',
	expander: '^4.4.4',
	tooltip: '^3.4.0',
};

const defaultOrigamiJsModules = {
	layout: '^3.3.1',
	expander: '^4.4.4',
	tooltip: '^3.4.0',
	date: '^2.11.0',
};

const getAssetReferences = ({
	isProduction,
	origamiJsModules = {},
	origamiCssModules = {},
	manifest = {
		'main.css': 'main.css',
		'main.js': 'main.js',
	},
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
		mainJs: getPathToStaticAsset(isProduction, manifest, 'main.js'),
		mainCss: getPathToStaticAsset(isProduction, manifest, 'main.css'),
	};
};

module.exports = {
	getAssetReferences,
};
