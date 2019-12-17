const logger = require('@financial-times/lambda-logger');
const { getApiClient } = require('./lib/tc-ui-bridge');
const { render: renderView } = require('./view');

async function deletePage(event) {
	const apiClient = getApiClient(event);
	const { type, code } = event.params;
	logger.debug(type, code, 'Delete Request');

	try {
		await apiClient.delete(type, code);
		return {
			status: 303,
			headers: {
				location: `/?message=${type} ${code} was successfully deleted&messageType=success`,
				'Cache-Control': 'max-age=0, private',
			},
		};
	} catch (err) {
		return renderView({
			...event,
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
