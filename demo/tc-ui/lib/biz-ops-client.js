const logger = require('@financial-times/lambda-logger');
const { getType } = require('@financial-times/tc-schema-sdk');
const fetch = require('node-fetch');
const httpError = require('http-errors');
const graphqlBuilder = require('./graphql-builder');

const { BIZ_OPS_API_URL, BIZ_OPS_API_KEY, BIZ_OPS_API_KEY_LOCAL } = {
	...process.env,
	BIZ_OPS_API_URL: 'http://local.in.ft.com:8888/api',
};

const extractErrorMessage = async response => {
	let errorMessage;
	try {
		const errors = await response.json();
		errorMessage = errors.errors
			? errors.errors.map(error => error.message).join('\n')
			: errors.error;
	} catch (err) {
		errorMessage = response.statusText;
	}
	return httpError(response.status, errorMessage);
};

const logAndThrowError = async (response, props) => {
	const error = await extractErrorMessage(response);
	logger.error(
		{
			error,
			event: 'BIZ_OPS_API_FAILURE',
		},
		props,
		`Biz Ops api call failed with status ${response.status}`,
	);
	throw error;
};

const getHeaders = clientUserId => {
	return {
		api_key: BIZ_OPS_API_KEY_LOCAL,
		'x-api-key': BIZ_OPS_API_KEY,
		'client-id': 'biz-ops-admin',
		'content-type': 'application/json',
		'client-user-id': clientUserId,
	};
};

const fetchGraphQL = async (body, clientUserId, plain = false) => {
	const options = {
		method: 'POST',
		body: JSON.stringify(body),
		headers: getHeaders(clientUserId),
	};

	try {
		const response = await fetch(`${BIZ_OPS_API_URL}/graphql`, options);
		if (!response.ok) {
			throw await extractErrorMessage(response);
		}

		const json = await response.json();
		if (plain) {
			return json;
		}

		if (json.errors) {
			logger.error(
				{
					errors: json.errors,
					variables: body.variables,
					event: 'BIZ_OPS_GRAPHQL_ERRORS',
				},
				'BizOps Graphql call had errors',
			);
		}
		return json.data;
	} catch (error) {
		logger.error(
			{ error, query: body.query, event: 'BIZ_OPS_GRAPHQL_REQUEST' },
			'BizOps Graphql call failed',
		);
		throw httpError(500, error);
	}
};

const writeRestAPIQuery = async (
	type,
	code,
	formData,
	method,
	clientUserId,
) => {
	const query =
		method === 'POST'
			? '?relationshipAction=merge' // POST params
			: '?relationshipAction=replace'; // PATCH params

	const options = {
		method,
		headers: getHeaders(clientUserId),
		body: JSON.stringify(formData),
	};
	console.log(
		`${BIZ_OPS_API_URL}/rest/${type}/${encodeURIComponent(code)}/${query}`,
		formData,
	);
	const response = await fetch(
		`${BIZ_OPS_API_URL}/rest/${type}/${encodeURIComponent(code)}/${query}`,
		options,
	);

	if (!response.ok) {
		await logAndThrowError(response, {
			endpoint: 'node',
			type,
			code,
			method: 'write',
		});
	}
	return { response: response.json(), status: response.status };
};

const deleteRestAPIQuery = async (type, code, clientUserId) => {
	const options = {
		method: 'DELETE',
		headers: {
			api_key: BIZ_OPS_API_KEY_LOCAL,
			'x-api-key': BIZ_OPS_API_KEY,
			'client-id': 'biz-ops-admin',
			'client-user-id': clientUserId,
			'content-type': 'application/json',
		},
	};
	const response = await fetch(
		`${BIZ_OPS_API_URL}/v2/node/${type}/${encodeURIComponent(code)}`,
		options,
	);
	if (!response.ok) {
		await logAndThrowError(response, {
			endpoint: 'node',
			type,
			code,
			method: 'delete',
		});
	}
	return { response: '', status: response.status };
};

const readRecord = async (type, code, clientUserId) => {
	try {
		getType(type);
	} catch (err) {
		if (/Invalid type/.test(err.message)) {
			throw httpError(
				404,
				`"${type}" is not a valid type of record in the biz-ops-api. Make sure you have entered the url correctly`,
			);
		}
		throw err;
	}

	return fetchGraphQL(
		{ query: graphqlBuilder(type), variables: { itemId: code } },
		clientUserId,
	)
		.then(response => {
			if (response[type] === null) {
				throw httpError(
					404,
					`A ${type} record for ${code} does not exist`,
				);
			}
			return response;
		})
		.then(graphqlData => graphqlData[type]);
};

const readRelationshipGraphQLQuery = async (type, code, clientUserId) => {
	try {
		getType(type);
	} catch (err) {
		if (/Invalid type/.test(err.message)) {
			throw httpError(
				404,
				`"${type}" is not a valid type of record in the biz-ops-api. Make sure you have entered the url correctly`,
			);
		}
		throw err;
	}

	return fetchGraphQL(
		{
			query: graphqlBuilder(type),
			variables: { itemId: code },
		},
		clientUserId,
	).then(response => {
		if (response[type] === null) {
			throw httpError(404, `A ${type} record for ${code} does not exist`);
		}
		return response[type];
	});
};

module.exports = {
	readRelationshipGraphQLQuery,
	fetchGraphQL,
	readRecord,
	writeRestAPIQuery,
	deleteRestAPIQuery,
};
