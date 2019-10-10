const { validateInput } = require('./lib/validation');
const { getNeo4jRecord } = require('./lib/read-helpers');

const { postHandler } = require('./post');

const patchHandler = ({ documentStore } = {}) => {
	const post = postHandler(({ documentStore } = {}));

	return async input => {
		const { type, code, body, metadata = {}, query = {} } = validateInput(
			input,
		);
		const preflightRequest = await getNeo4jRecord(type, code);

		if (!preflightRequest.hasRecords()) {
			return post(
				Object.assign(
					{ skipPreflight: true, responseStatus: 201 },
					input,
				),
			);
		}
	};
};

module.exports = { patchHandler };
