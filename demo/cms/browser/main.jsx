require('./main.css');
require('@financial-times/tc-ui');

const React = require('react');
const { hydrate } = require('react-dom');
const DecomButton = require('../components/decomButton');

hydrate(<DecomButton />, document.getElementById('decommission-override').parentNode);

console.log('hihihi');
