const {
	applyMiddleware,
	getCrudController,
	unimplemented
} = require('./lib/crud-router');

module.exports = router => {
	applyMiddleware(router);

	const pathPattern = '/:nodeType/:code';
	const crudController = getCrudController('node', {
		create: require('./crud-v2/create'),
		read: require('./crud-v2/read'),
		update: require('./crud-v2/update'),
		delete: require('./crud-v2/delete')
	});

	router.get(pathPattern, crudController('GET'));
	router.post(pathPattern, crudController('POST'));
	router.put(pathPattern, unimplemented('PUT', 'PATCH'));
	router.patch(pathPattern, crudController('PATCH'));
	router.delete(pathPattern, crudController('DELETE'));

	return router;
};
