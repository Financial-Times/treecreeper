const { render } = require('preact-render-to-string');
const { h } = require('preact');
const Layout = require('../templates/layout/layout');
const errorTemplate = require('../templates/error-page');

const renderPage = (Template, props) => {
	return `
<!DOCTYPE html>
${render(
	<Layout {...props}>
		<Template {...props} />
	</Layout>,
)}`;
};

const handleError = func => (...args) =>
	func(...args).catch(error => {
		const status = error.status || 500;
		return {
			status,
			body: renderPage(errorTemplate, { status, error }),
		};
	});

const page = (template, data, event, status = 200) => {
	const user = event.isSignedIn && event.username;
	const fromDewey = !!(event.query || {})['from-dewey'];
	const { message, messageType } = event.query || {};
	return {
		status,
		body: renderPage(
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
	handleError,
	page,
};
