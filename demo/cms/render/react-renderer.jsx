const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const {
	origamiModules: { js: tcUiJsModules, css: tcUiCssModules },
} = require('@financial-times/tc-ui');
const { Header } = require('../components/header');
const { Footer } = require('../components/footer');
const Layout = require('./layout');

const assetManifest = {
	'main.css': 'main.css',
	'main.js': 'main.js',
};

const ASSET_ROOT = 'http://local.in.ft.com:8080/statics/';
const BUILD_SERVICE_BASE_URL =
	'https://www.ft.com/__origami/service/build/v2/bundles';

const constructOrigamiUrl = (type, componentsMap) =>
	`${BUILD_SERVICE_BASE_URL}/${type}?brand=internal&modules=${Object.entries(
		componentsMap,
	)
		.map(([key, val]) => `${key}@${val}`)
		.join(',')}`;

const assetReferences = {
	origamiJs: constructOrigamiUrl('js', {
		...tcUiJsModules,
		'o-table': '^7.0.5',
		'o-header-services': '^3.2.3',
	}),
	origamiCss: constructOrigamiUrl('css', {
		...tcUiCssModules,
		'o-header-services': '^3.2.3',
		'o-table': '^7.0.5',
		'o-labels': '^4.1.1',
		'o-footer-services': '^2.1.0',
	}),
	mainJs: `${ASSET_ROOT}${assetManifest['main.js']}`,
	mainCss: `${ASSET_ROOT}${assetManifest['main.css']}`,
};

const renderHtml = (Template, props) => {
	props = {
		...props,
		Header,
		Footer,
		...assetReferences,
	};
	return `
	<!DOCTYPE html>
	${renderToStaticMarkup(
		<Layout {...props}>
			<Template {...props} />
		</Layout>,
	)}`;
};

module.exports = { renderHtml };
