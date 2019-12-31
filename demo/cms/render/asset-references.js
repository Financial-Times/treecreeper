const buildServiceBaseUrl =
	'https://www.ft.com/__origami/service/build/v2/bundles';

const buildOrigamiUrl = (type, componentsMap) =>
	`${buildServiceBaseUrl}/${type}?brand=internal&modules=${Object.entries(
		componentsMap,
	)
		.map(([key, val]) => `${key}@${val}`)
		.join(',')}`;

const customOrigamiCssModules = {
	'o-header-services': '^3.2.3',
	'o-table': '^7.0.5',
	'o-labels': '^4.1.1',
	'o-footer-services': '^2.1.0',
};

const customOrigamiJsModules = {
	'o-table': '^7.0.5',
	'o-header-services': '^3.2.3',
};

const getAssetReferences = ({
	tcUiJsModules,
	tcUiCssModules,
	assetManifest,
	assetRoot,
}) => {
	console.log({ tcUiCssModules });
	return {
		origamiJs: buildOrigamiUrl('js', {
			...tcUiJsModules,
			...customOrigamiJsModules,
		}),
		origamiCss: buildOrigamiUrl('css', {
			...tcUiCssModules,
			...customOrigamiCssModules,
		}),
		mainJs: `${assetRoot}${assetManifest['main.js']}`,
		mainCss: `${assetRoot}${assetManifest['main.css']}`,
	};
};
module.exports = {
	getAssetReferences,
};
