const { handler: viewHandler } = require('./view');
const { handler: editHandler } = require('./edit');
const { handler: deleteHandler } = require('./delete');

module.exports = {
	view: viewHandler,
	edit: editHandler,
	delete: deleteHandler,
};
