const render = require('./render');

const get = (status, message) => ({
	status: status || 500,
	body: message,
	headers: {
		'Content-Type': 'text/html',
		'Cache-Control': 'max-age=0, private',
	},
});

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

const redirect = (location, status = 303) => ({
	status,
	headers: {
		location,
		'Cache-Control': 'max-age=0, private',
	},
});

module.exports = {
	get,
	redirect,
	page,
};
