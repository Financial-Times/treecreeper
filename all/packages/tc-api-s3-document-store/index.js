const { defaultS3Instance } = require('./s3');
const { s3Get } = require('./get');
const { s3Post } = require('./post');
const { s3Patch } = require('./patch');
const { s3Delete } = require('./delete');
const { s3Absorb } = require('./absorb');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;

const docstore = (
	s3Instance = defaultS3Instance,
	bucketName = TREECREEPER_DOCSTORE_S3_BUCKET,
) => {
	return {
		get: async (type, code) =>
			s3Get({
				s3Instance,
				bucketName,
				type,
				code,
			}),
		post: async (type, code, body) =>
			s3Post({
				s3Instance,
				bucketName,
				type,
				code,
				body,
			}),
		patch: async (type, code, body) =>
			s3Patch({
				s3Instance,
				bucketName,
				type,
				code,
				body,
			}),
		delete: async (type, code) =>
			s3Delete({
				s3Instance,
				bucketName,
				type,
				code,
			}),
		absorb: async (type, absorbedCode, code) =>
			s3Absorb({
				s3Instance,
				bucketName,
				type,
				absorbedCode,
				code,
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
