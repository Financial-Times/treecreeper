const querystring = require('querystring');
const { render } = require('preact-render-to-string');
const { h } = require('preact');
const Layout = require('./layout');
const errorTemplate = require('./error-page');
const messages = require('./messages');

const getPageRenderer = ({ Header, Footer }) => {
	const renderHtml = (Template, props) => {
		props = {...props, Header, Footer}
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
				body: renderHtml(errorTemplate, { status, error }),
			};
		});

	const renderPage = (template, data, event, status = 200) => {
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

	return {
		handleError,
		renderPage,
	};
};

module.exports = {
	getPageRenderer, ...messages
 };
