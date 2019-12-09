const logger = require('@financial-times/lambda-logger');
const response = require('./lib/response');
const { deleteRestAPIQuery } = require('./lib/biz-ops-client');
const { render: renderView } = require('./view');

async function deletePage(event) {
	const { type, code } = event.params;
	logger.debug(type, code, 'Delete Request');

	try {
		await deleteRestAPIQuery(type, code, event.username);
		return response.redirect(
			`/?message=${type} ${code} was successfully deleted&messageType=success`,
		);
	} catch (err) {
		return renderView(event, {
			type,
			code,
			pageType: 'delete',
			pageTitle: `Failed to delete ${type} ${code}`,
			error: {
				type,
				code,
				action: 'delete',
				message: err.message,
			},
		});
	}
}

exports.handler = deletePage;
