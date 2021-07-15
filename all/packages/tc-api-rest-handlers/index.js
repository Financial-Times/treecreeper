const { headHandler } = require('./head');
const { getHandler } = require('./get');
const { deleteHandler } = require('./delete');
const { postHandler } = require('./post');
const { patchHandler } = require('./patch');
const { absorbHandler } = require('./absorb');
const { emitter, availableEvents } = require('./lib/events');

module.exports = {
	headHandler,
	getHandler,
	deleteHandler,
	postHandler,
	patchHandler,
	absorbHandler,
	emitter,
	availableEvents,
};
