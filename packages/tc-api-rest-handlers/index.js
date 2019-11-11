const { headHandler } = require('./head');
const { getHandler } = require('./get');
const { deleteHandler } = require('./delete');
const { postHandler } = require('./post');
const { patchHandler } = require('./patch');
const { absorbHandler } = require('./absorb');

module.exports = {
	headHandler,
	getHandler,
	deleteHandler,
	postHandler,
	patchHandler,
	absorbHandler,
};
