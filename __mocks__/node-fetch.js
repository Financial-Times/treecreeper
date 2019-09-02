const nodeFetch = jest.requireActual('node-fetch');
const fetchMock = require('fetch-mock').sandbox();

Object.assign(fetchMock.config, nodeFetch, {
	fetch: nodeFetch,

	fallbackToNetwork: 'always',
});
module.exports = Object.assign(fetchMock, {
	Request: nodeFetch.Request,
	Response: nodeFetch.Response,
	Headers: nodeFetch.Headers,
});
