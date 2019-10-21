const { getHandler } = require('./get');
const { deleteHandler } = require('./delete');
const { postHandler } = require('./post');
const { patchHandler } = require('./patch');
const { absorbHandler } = require('./absorb');

module.exports = {
	getHandler,
	deleteHandler,
	postHandler,
	patchHandler,
	absorbHandler,
};
