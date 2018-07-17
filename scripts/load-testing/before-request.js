

function setHeaders(requestParams, context, ee, next) {
	requestParams.headers = {
		'Content-Type': 'application/json',
		api_key: process.env.LOAD_TEST_API_KEY,
		'client-id': 'load-testing'
	};

	return next();
}

module.exports = {
	setHeaders
};
