const { stripIndents } = require('common-tags');
const httpErrors = require('http-errors');
const ERROR_RX = Object.freeze({
	nodeExists: /already exists with label/,
	missingRelated: /Expected to find a node at related(\d+) but found nothing/
});

const handleUpsertError = (err, relationships) => {
	const missingRelatedIndex = (ERROR_RX.missingRelated.exec(err.message) ||
		[])[1];
	if (missingRelatedIndex) {
		const missing = relationships[missingRelatedIndex];
		throw httpErrors(
			400,
			stripIndents`Missing related node ${missing.nodeType} ${missing.nodeCode}.
			If you need to create multiple things which depend on each other,
			use the \`upsert=true\` query string to create placeholder entries for
			related things which can be populated with attributes with subsequent
			API calls.
			DO NOT use \`upsert\` if you are attempting to create a relationship with
			an item that already exists - there's probably a mistake somewhere in your
			code`
		);
	}
};

const handleDuplicateNodeError = (err, nodeType, code) => {
	if (ERROR_RX.nodeExists.test(err.message)) {
		throw httpErrors(409, `${nodeType} ${code} already exists`);
	}
};

const handleMissingNode = ({ result, nodeType, code, status }) => {
	if (!result.records.length) {
		throw httpErrors(status, `${nodeType} ${code} does not exist`);
	}
};

module.exports = {
	handleUpsertError,
	handleDuplicateNodeError,
	handleMissingNode
};
