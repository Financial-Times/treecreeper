const render = require('./render');

const page = (template, data, event, status = 200) => {
	const user = event.isSignedIn && event.username;
	const fromDewey = !!(event.query || {})['from-dewey'];
	const { message, messageType } = event.query || {};
	return {
		status,
		body: render(
			template,
			Object.assign(data, { user, fromDewey, message, messageType }),
		),
		headers: {
			'Content-Type': 'text/html',
			'Cache-Control': 'max-age=0, private',
		},
	};
};

module.exports = {
	page,
};
