const { getHandler } = require('./get');
const { deleteHandler } = require('./delete');
const { postHandler } = require('./post');
const { patchHandler } = require('./patch');

module.exports = {
	getHandler,
	deleteHandler,
	postHandler,
	patchHandler,
};
