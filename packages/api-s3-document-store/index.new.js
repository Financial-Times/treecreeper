const { defaultS3Instance, getBucketName } = require('./s3');
const { s3Get } = require('./get');
const { s3Post } = require('./post');
const { s3Patch } = require('./patch');
const { s3Delete } = require('./delete');
const { s3Merge } = require('./merge');

const docstore = (
	s3Instance = defaultS3Instance,
	bucketName = getBucketName(),
) => {
	return {
		get: async (nodeType, code) =>
			s3Get({
				s3Instance,
				bucketName,
				nodeType,
				code,
			}),
		post: async (nodeType, code, body) =>
			s3Post({
				s3Instance,
				bucketName,
				nodeType,
				code,
				body,
			}),
		patch: async (nodeType, code, body) =>
			s3Patch({
				s3Instance,
				bucketName,
				nodeType,
				code,
				body,
			}),
		delete: async (nodeType, code, versionMarker) =>
			s3Delete({
				s3Instance,
				bucketName,
				nodeType,
				code,
				versionMarker,
			}),
		merge: async (nodeType, sourceCode, destinationCode) =>
			s3Merge({
				s3Instance,
				bucketName,
				nodeType,
				sourceCode,
				destinationCode,
			}),
	};
};

module.exports = docstore;
