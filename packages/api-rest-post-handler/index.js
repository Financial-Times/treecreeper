const { validateInput } = require('../api-core/lib/validation');

const getHandler = ({ documentStore } = {}) => async input => {
	const { type, code, body, metadata, query } = validateInput(input);
};

module.exports = { postHandler };
