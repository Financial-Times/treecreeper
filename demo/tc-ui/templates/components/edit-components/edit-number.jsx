const { Component } = require('./edit-text');

module.exports = {
	Component,
	parser: value => Number(value),
};
