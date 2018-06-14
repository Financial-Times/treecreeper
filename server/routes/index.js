const graphqlRoutes = require('./graphql');
const uiRoutes = require('./ui');
const v1Routes = require('./v1');

module.exports = {
	graphql: graphqlRoutes,
	ui: uiRoutes,
	v1: v1Routes
};
