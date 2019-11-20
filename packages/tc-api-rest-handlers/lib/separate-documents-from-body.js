const _isEmpty = require('lodash.isempty');
const { getType } = require('@financial-times/tc-schema-sdk');

const separateDocsFromBody = (nodeType, body = {}) => {
	const { properties } = getType(nodeType);
	const bodyDocuments = {};
	const bodyNoDocs = {};

	Object.entries(body).forEach(([key, value]) => {
		if (properties[key].type === 'Document') {
			// We should check the value is empty only when type is Document
			// because other type will be passed as boolean, number, etc...
			// then _isEmpty() will returns true
			if (!_isEmpty(value)) {
				bodyDocuments[key] = body[key];
			}
		} else {
			bodyNoDocs[key] = body[key];
		}
	});

	return { documents: bodyDocuments, body: bodyNoDocs };
};

module.exports = {
	separateDocsFromBody,
};
