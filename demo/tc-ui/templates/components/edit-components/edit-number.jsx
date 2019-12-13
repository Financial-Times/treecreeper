const { Component } = require('./edit-text');

module.exports = {
	EditComponent: Component,
	parser: value => Number(value),
};
