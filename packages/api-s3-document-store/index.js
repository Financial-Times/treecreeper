const { defaultS3Instance } = require('./s3');
const { s3Get } = require('./get');
const { s3Post } = require('./post');
const { s3Patch } = require('./patch');
const { s3Delete } = require('./delete');
const { s3Merge } = require('./merge');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;

const docstore = (
	s3Instance = defaultS3Instance,
	bucketName = TREECREEPER_DOCSTORE_S3_BUCKET,
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

// Factory method which user intend to use their S3 bucket
const createStore = (s3BucketName = TREECREEPER_DOCSTORE_S3_BUCKET) =>
	docstore(defaultS3Instance, s3BucketName);

module.exports = {
	docstore,
	createStore,
};
