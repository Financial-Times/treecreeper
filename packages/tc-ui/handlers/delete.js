const getDeleteHandler = ({
	getApiClient,
	handleError,
	viewRender,
	logger,
}) => {
	const deletePage = async event => {
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
			return viewRender({
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
	};

	return { handler: handleError(deletePage) };
};

module.exports = {
	getDeleteHandler,
};
