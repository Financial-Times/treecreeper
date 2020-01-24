const { getType } = require('@financial-times/tc-schema-sdk');
const fetch = require('node-fetch');
const httpError = require('http-errors');

class ApiClient {
	constructor(options) {
		this.options = options;
		Object.assign(this, options);
	}

	getHeaders() {
		const headers =
			typeof this.apiHeaders === 'function'
				? this.apiHeaders(this.event)
				: this.apiHeaders;
		return {
			'content-type': 'application/json',
			...headers,
		};
	}

	async extractErrorMessage(response) {
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
	}

	async logAndThrowError(response, props) {
		const error = await this.extractErrorMessage(response);
		this.logger.error(
			{
				error,
				event: 'API_ERROR',
			},
			props,
			`Api call failed with status ${response.status}`,
		);
		throw error;
	}

	async fetchGraphQL(body) {
		try {
			const response = await fetch(`${this.graphqlApiUrl}`, {
				method: 'POST',
				body: JSON.stringify(body),
				headers: this.getHeaders(),
			});

			if (!response.ok) {
				throw await this.extractErrorMessage(response);
			}

			const json = await response.json();

			if (json.errors) {
				this.logger.error(
					{
						errors: json.errors,
						variables: body.variables,
						event: 'GRAPHQL_ERRORS',
					},
					'BizOps Graphql call had errors',
				);
			}
			return json.data;
		} catch (error) {
			this.logger.error(
				{ error, query: body.query, event: 'GRAPHQL_REQUEST' },
				'BizOps Graphql call failed',
			);
			throw httpError(500, error);
		}
	}

	async write(type, code, formData, method) {
		const response = await fetch(
			`${this.restApiUrl}/${type}/${encodeURIComponent(
				code,
			)}?relationshipAction=replace`,
			{
				method,
				headers: this.getHeaders(),
				body: JSON.stringify(formData),
			},
		);

		if (!response.ok) {
			await this.logAndThrowError(response, {
				endpoint: 'node',
				type,
				code,
				method: 'write',
			});
		}
		return { response: await response.json(), status: response.status };
	}

	async delete(type, code) {
		const response = await fetch(
			`${this.restApiUrl}/${type}/${encodeURIComponent(code)}`,
			{
				method: 'DELETE',
				headers: this.getHeaders(),
			},
		);
		if (!response.ok) {
			await this.logAndThrowError(response, {
				endpoint: 'node',
				type,
				code,
				method: 'delete',
			});
		}
		return { status: response.status };
	}

	async read(type, code) {
		try {
			getType(type);
		} catch (err) {
			if (/Invalid type/.test(err.message)) {
				throw httpError(
					404,
					`"${type}" is not a valid type of record. Make sure you have entered the url correctly`,
				);
			}
			throw err;
		}
		const query = this.graphqlBuilder(type);

		return this.fetchGraphQL({
			query,
			variables: { itemId: code },
		})
			.then(response => {
				if (!response[type]) {
					throw httpError(
						404,
						`A ${type} record for ${code} does not exist`,
					);
				}
				return response;
			})
			.then(graphqlData => graphqlData[type]);
	}
}

module.exports = { ApiClient };
