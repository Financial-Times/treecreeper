const buildServiceBaseUrl =
	'https://www.ft.com/__origami/service/build/v2/bundles';

const buildOrigamiUrl = (type, componentsMap) =>
	`${buildServiceBaseUrl}/${type}?brand=internal&modules=${Object.entries(
		componentsMap,
	)
		.map(([key, val]) => `o-${key}@${val}`)
		.join(',')}`;

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
};

const defaultOrigamiJsModules = {
	layout: '^3.3.1',
	expander: '^4.4.4',
	tooltip: '^3.4.0',
	date: '^2.11.0',
};

const getAssetReferences = ({
	origamiJsModules = {},
	origamiCssModules = {},
	assetManifest,
	assetRoot,
}) => {
	return {
		origamiJs: buildOrigamiUrl('js', {
			...origamiJsModules,
			...defaultOrigamiJsModules,
		}),
		origamiCss: buildOrigamiUrl('css', {
			...origamiCssModules,
			...defaultOrigamiCssModules,
		}),
		mainJs: `${assetRoot}${assetManifest['main.js']}`,
		mainCss: `${assetRoot}${assetManifest['main.css']}`,
	};
};
module.exports = {
	getAssetReferences,
};
