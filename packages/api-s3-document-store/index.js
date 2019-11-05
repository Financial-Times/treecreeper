const { defaultS3Instance } = require('./s3');
const { s3Get, composeS3Get } = require('./get');
const { s3Post, composeS3Post } = require('./post');
const { s3Patch, composeS3Patch } = require('./patch');
const { s3Delete, composeS3Delete } = require('./delete');
const { s3Absorb, composeS3Absorb } = require('./absorb');
const Composer = require('../api-express/lib/composer');
const { getLogger } = require('../api-express-logger');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;

const docstore = ({
	s3Instance = defaultS3Instance,
	bucketName = TREECREEPER_DOCSTORE_S3_BUCKET,
	logger = getLogger(),
} = {}) => {
	return {
		get: async (nodeType, code) =>
			s3Get({
				s3Instance,
				bucketName,
				nodeType,
				code,
				logger,
			}),
		post: async (nodeType, code, body) =>
			s3Post({
				s3Instance,
				bucketName,
				nodeType,
				code,
				body,
				logger,
			}),
		patch: async (nodeType, code, body) =>
			s3Patch({
				s3Instance,
				bucketName,
				nodeType,
				code,
				body,
				logger,
			}),
		delete: async (nodeType, code, versionMarker) =>
			s3Delete({
				s3Instance,
				bucketName,
				nodeType,
				code,
				versionMarker,
				logger,
			}),
		absorb: async (nodeType, sourceCode, destinationCode) =>
			s3Absorb({
				s3Instance,
				bucketName,
				nodeType,
				sourceCode,
				destinationCode,
				logger,
			}),
	};
};

// Factory method which user intend to use their S3 bucket
const createStore = (s3BucketName = TREECREEPER_DOCSTORE_S3_BUCKET) =>
	docstore(defaultS3Instance, s3BucketName);

class DocumentStore extends Composer {
	constructor(composeOptions = {}, ...packages) {
		super(composeOptions, ...packages);
	}
}

const composeDocumentStore = (composeOptions = {}) => {
	// Check already composed for testing
	if ('documentStore' in composeOptions) {
		return composeOptions;
	}
	// Pick fields which documentStore wants to
	const {
		s3Instance = defaultS3Instance,
		bucketName = TREECREEPER_DOCSTORE_S3_BUCKET,
		logger,
	} = composeOptions;

	const documentStore = new DocumentStore(
		{ s3Instance, bucketName, logger },
		composeS3Get,
		composeS3Post,
		composeS3Patch,
		composeS3Delete,
		composeS3Absorb,
	);

	return {
		...composeOptions,
		documentStore,
	};
};

module.exports = {
	docstore,
	createStore,
	DocumentStore,
	composeDocumentStore,
};
