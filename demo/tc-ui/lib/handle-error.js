const render = require('./render');
const errorTemplate = require('../templates/error-page');

const handleError = func => (...args) =>
	func(...args).catch(error => {
		const status = error.status || 500;
		return {
			status,
			body: render(errorTemplate, { status, error }),
		};
	});

module.exports = { handleError };
