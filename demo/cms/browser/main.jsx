require('./main.css');
require('@financial-times/tc-ui');

const React = require('react');
const { hydrate } = require('react-dom');
const DecomButton = require('../components/decomButton');

const container = document.querySelector('#decommission-override');

if (container) {
	console.log('the container is there')
	console.log('conatiner dataset props', container.dataset.props)
	hydrate(
		<DecomButton {...JSON.parse(container.dataset.props)} />,
		container.parentNode,
	);
}

