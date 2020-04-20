require('./main.css');
require('@financial-times/tc-ui');

const React = require('react');
const { hydrate } = require('react-dom');
const DecomButton = require('../components/decomButton');

const container = document.querySelector('#decommission-override');

if (container) {
	hydrate(
		<DecomButton {...JSON.parse(container.dataset.props)} />,
		container.parentNode,
	);
}

