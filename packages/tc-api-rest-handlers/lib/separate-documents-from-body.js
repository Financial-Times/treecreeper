const { getType } = require('@financial-times/tc-schema-sdk');

const separateDocsFromBody = (nodeType, body = {}) => {
	const { properties } = getType(nodeType);
	const bodyDocuments = {};
	const bodyNoDocs = {};

	Object.entries(body).forEach(([key, value]) => {
		// checking for `!` avoids errors being thrown when iterating over
		// 'delete relationships' properties
		if (key.charAt(0) !== '!' && properties[key].type === 'Document') {
			bodyDocuments[key] = value;
		} else {
			bodyNoDocs[key] = value;
		}
	});

	return { documents: bodyDocuments, body: bodyNoDocs };
};

module.exports = {
	separateDocsFromBody,
};
