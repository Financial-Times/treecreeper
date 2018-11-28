const {
	applyMiddleware,
	getCrudControllers,
	unimplemented,
	getCustomController
} = require('./lib/route-helpers');

const merge = require('./v2-merge');

module.exports = router => {
	applyMiddleware(router);

	const crudControllers = getCrudControllers('node', {
		create: require('./crud-v2/create'),
		read: require('./crud-v2/read'),
		update: require('./crud-v2/update'),
		delete: require('./crud-v2/delete')
	});

	router
		.route('/node/:nodeType/:code')
		.get(crudControllers('GET'))
		.post(crudControllers('POST'))
		.put(unimplemented('PUT', 'PATCH'))
		.patch(crudControllers('PATCH'))
		.delete(crudControllers('DELETE'));

	router.post('/merge', getCustomController('merge', 'POST', merge));

	return router;
};
