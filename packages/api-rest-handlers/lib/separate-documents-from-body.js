const _isEmpty = require('lodash.isempty');
const { getType } = require('../../schema-sdk');

const separateDocsFromBody = (nodeType, body) => {
	const { properties } = getType(nodeType);
	const bodyDocuments = {};
	const bodyNoDocs = {};

	Object.entries(body).forEach(([key, value]) => {
		if (!_isEmpty(value)) {
			if (properties[key].type === 'Document') {
				bodyDocuments[key] = body[key];
			} else {
				bodyNoDocs[key] = body[key];
			}
		}
	});

	return { bodyDocuments, bodyNoDocs };
};

module.exports = {
	separateDocsFromBody,
};
