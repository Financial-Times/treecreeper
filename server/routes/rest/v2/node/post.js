const AWS = require('aws-sdk');
const { validateParams, validatePayload } = require('../../lib/validation');
const {
	dbErrorHandlers,
	preflightChecks,
} = require('../../lib/error-handling');
const { createNewNode } = require('../../lib/write-helpers');

const create = async input => {
	validateParams(input);
	validatePayload(input);

	const { nodeType, code, clientId, query, body } = input;

	preflightChecks.handleSimultaneousWriteAndDelete(body);

	// console.log("LOOK HERE: nodeType ", nodeType, "code ", code, "clientId ", clientId, "query ", query, "body ", body)
	const s3 = new AWS.S3({
		accessKeyId: process.env.AWS_ACCESS_KEY,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	});

	const params = {
		Bucket: 'biz-ops-documents.510688331160',
		Key: `${nodeType}/${code}`,
		Body: JSON.stringify(body),
	};
	s3.upload(params, function(err, data) {
		console.log('post');
		console.log(err, data);
	});

	try {
		return await createNewNode({
			nodeType,
			code,
			clientId,
			query,
			body,
			method: 'POST',
		});
	} catch (err) {
		dbErrorHandlers.duplicateNode(err, nodeType, code);
		dbErrorHandlers.nodeUpsert(err);
		throw err;
	}
};

module.exports = create;
