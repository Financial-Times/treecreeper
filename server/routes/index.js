const apiRoutes = require('./api');
const uiRoutes = require('./ui');
const v1Routes = require('./v1');

module.exports = {
	api: apiRoutes,
	ui: uiRoutes,
	v1: v1Routes
};
