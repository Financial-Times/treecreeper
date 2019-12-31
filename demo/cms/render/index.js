const querystring = require('querystring');

const { renderHtml } = require('./react-renderer');

const errorTemplate = require('./error-page');

const handleError = func => async (...args) => {
	try {
		return func(...args);
	} catch (error) {
		const status = error.status || 500;
		return {
			status,
			body: renderHtml(errorTemplate, { status, error }),
		};
	}
};

const renderPage = ({ template, data, event = {}, status = 200 }) => {
	const user = event.isSignedIn && event.username;
	const fromDewey = !!(event.query || {})['from-dewey'];
	const { message, messageType } = event.query || {};
	return {
		status,
		body: renderHtml(
			template,
			Object.assign(data, {
				user,
				fromDewey,
				message,
				messageType,
				querystring: querystring.stringify(event.query),
			}),
		),
		headers: {
			'Content-Type': 'text/html',
			'Cache-Control': 'max-age=0, private',
		},
	};
};

module.exports = {
	handleError,
	renderPage,
};
