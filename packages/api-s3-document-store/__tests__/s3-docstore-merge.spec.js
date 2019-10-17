jest.mock('aws-sdk');
jest.mock('../post');
jest.mock('../get');
jest.mock('../delete');

const { S3 } = require('aws-sdk');
const { createS3Instance } = require('../s3');
const { docstore } = require('..');
const postModule = require('../post');
const getModule = require('../get');
const deleteModule = require('../delete');
const { undoCreate, undoDelete } = require('../undo');
const {
	s3DeleteObjectResponseFixture,
	s3UploadResponseFixture,
	createExampleBodyData,
} = require('../__fixtures__/s3-object-fixture');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;
const consistentNodeType = 'System';

const createSourceBodyData = () => ({
	extraField: 'willBeMerged',
});

const createDestinationBodyData = () => createExampleBodyData();

const createStub = (module, method, resolveValueMap) => {
	const rejectKeyword = `${method}-unexpected`;

	return jest.spyOn(module, method).mockImplementation(async ({ code }) => {
		if (!(code in resolveValueMap)) {
			throw new Error(`unexpected system code ${code} is provided.`);
		}
		if (code.indexOf(rejectKeyword) !== -1) {
			throw new Error(`unexpected error for ${method}`);
		}
		return resolveValueMap[code];
	});
};

const mockS3Merge = (
	{ fromSystemCode, fromNodeBody, fromVersionMarker },
	{ toSystemCode, toNodeBody, toVersionMarker },
) => {
	const stubDeleteOnUndo = jest.fn(({ Key }) => {
		const resolveData =
			Key === `${consistentNodeType}/${fromSystemCode}`
				? s3DeleteObjectResponseFixture(fromVersionMarker)
				: s3DeleteObjectResponseFixture(toVersionMarker);
		return {
			promise: jest.fn().mockImplementation(async () => resolveData),
		};
	});
	const stubUploadOnUndo = jest.fn(() => {
		const fixture = s3UploadResponseFixture(
			TREECREEPER_DOCSTORE_S3_BUCKET,
			`${consistentNodeType}/${fromSystemCode}`,
			fromVersionMarker,
		);
		return {
			promise: jest.fn(async () => fixture),
		};
	});

	S3.mockImplementation(() => ({
		deleteObject: stubDeleteOnUndo,
		upload: stubUploadOnUndo,
	}));

	// We need to create S3 instance here in order to use mocked instance
	const s3Instance = createS3Instance({
		accessKeyId: 'testAccessKeyId',
		secretAccessKey: 'testSecretAccessKey',
	});

	// s3Merge depends on s3Get, s3Delete and s3Post module so we create stub for them
	// When 'post-unexpected' word is included on provided system code (e,g `docstore-merge-test-post-unexpected`), then we'll throw error
	const stubPost = jest
		.spyOn(postModule, 's3Post')
		.mockImplementation(async ({ code, body }) => {
			if (code.indexOf('s3Post-unexpected') !== -1) {
				throw new Error('unexpected error');
			}
			return {
				versionMarker: toVersionMarker,
				body,
				undo: undoCreate({
					s3Instance,
					bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
					nodeType: consistentNodeType,
					code,
					versionMarker: toVersionMarker,
				}),
			};
		});

	const stubGet = createStub(getModule, 's3Get', {
		[fromSystemCode]: { body: fromNodeBody },
		[toSystemCode]: { body: toNodeBody },
	});
	const stubDelete = createStub(deleteModule, 's3Delete', {
		[fromSystemCode]: {
			versionMarker: fromVersionMarker,
			undo: undoDelete({
				s3Instance,
				bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
				nodeType: consistentNodeType,
				code: fromSystemCode,
				versionMarker: fromVersionMarker,
				body: fromNodeBody,
			}),
		},
		[toSystemCode]: {
			versionMarker: toVersionMarker,
			undo: undoDelete({
				s3Instance,
				bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
				nodeType: consistentNodeType,
				code: toSystemCode,
				versionMarker: toVersionMarker,
				body: toNodeBody,
			}),
		},
	});

	return {
		s3Instance,
		stubGet,
		stubPost,
		stubDelete,
		stubDeleteOnUndo,
		stubUploadOnUndo,
	};
};

describe('S3 document helper merge', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	const matcher = (s3Instance, code, body) => ({
		s3Instance,
		bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
		nodeType: consistentNodeType,
		code,
		...(body ? { body } : {}),
	});

	const s3CallMatcher = (code, versionMarker, body) => ({
		Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
		Key: `${consistentNodeType}/${code}`,
		...(versionMarker ? { VersionId: versionMarker } : {}),
		...(body ? { Body: JSON.stringify(body) } : {}),
	});

	test('returns with merged object, posted version, deleted version and undo function', async () => {
		const fromSystemCode = 'docstore-merge-src';
		const fromNodeBody = createSourceBodyData();
		const fromVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
		const toSystemCode = 'docstore-merge-dest';
		const toNodeBody = createDestinationBodyData();
		const toVersionMarker = 'ios1J2p4h2MywrrvbfaUts.B3JbAQe2V';

		const {
			stubGet,
			stubPost,
			stubDelete,
			stubDeleteOnUndo,
			stubUploadOnUndo,
			s3Instance,
		} = mockS3Merge(
			{ fromSystemCode, fromNodeBody, fromVersionMarker },
			{ toSystemCode, toNodeBody, toVersionMarker },
		);

		const store = docstore(s3Instance);

		const result = await store.merge(
			consistentNodeType,
			fromSystemCode,
			toSystemCode,
		);

		expect(result).toMatchObject({
			versionMarker: toVersionMarker,
			siblingVersionMarker: fromVersionMarker,
			body: Object.assign({}, toNodeBody, fromNodeBody),
			undo: expect.any(Function),
		});

		expect(stubGet).toHaveBeenCalledTimes(2);
		[
			matcher(s3Instance, fromSystemCode),
			matcher(s3Instance, toSystemCode),
		].forEach((match, index) => {
			// Nth starts with 1 so we use index with adding 1
			expect(stubGet).toHaveBeenNthCalledWith(index + 1, match);
		});

		expect(stubPost).toHaveBeenCalledTimes(1);
		expect(stubPost).toHaveBeenCalledWith(
			matcher(
				s3Instance,
				toSystemCode,
				Object.assign({}, toNodeBody, fromNodeBody),
			),
		);
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith(
			matcher(s3Instance, fromSystemCode),
		);

		const undoResult = await result.undo();
		expect(undoResult).toMatchObject({
			versionMarker: result.versionMarker,
			siblingVersionMarker: result.siblingVersionMarker,
		});
		// undo post destination
		expect(stubDeleteOnUndo).toHaveBeenCalledWith(
			s3CallMatcher(toSystemCode, result.versionMarker),
		);
		// undo delete source
		expect(stubUploadOnUndo).toHaveBeenCalledWith(
			s3CallMatcher(fromSystemCode, null, createSourceBodyData()),
		);
	});

	test('returns empty object when source node body is empty', async () => {
		const fromSystemCode = 'docstore-merge-src';
		const fromNodeBody = {};
		const fromVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
		const toSystemCode = 'docstore-merge-dest';
		const toNodeBody = createDestinationBodyData();
		const toVersionMarker = 'ios1J2p4h2MywrrvbfaUts.B3JbAQe2V';

		const { stubGet, stubPost, stubDelete, s3Instance } = mockS3Merge(
			{ fromSystemCode, fromNodeBody, fromVersionMarker },
			{ toSystemCode, toNodeBody, toVersionMarker },
		);

		const store = docstore(s3Instance);

		const result = await store.merge(
			consistentNodeType,
			fromSystemCode,
			toSystemCode,
		);

		expect(stubGet).toHaveBeenCalledTimes(2);
		[
			matcher(s3Instance, fromSystemCode),
			matcher(s3Instance, toSystemCode),
		].forEach((match, index) => {
			// Nth starts with 1 so we use index with adding 1
			expect(stubGet).toHaveBeenNthCalledWith(index + 1, match);
		});

		expect(stubPost).not.toHaveBeenCalled();
		expect(stubDelete).not.toHaveBeenCalled();
		expect(Object.keys(result)).toHaveLength(0);
	});

	test('throws error when delete and post fail', async () => {
		const fromSystemCode = 'docstore-merge-src-s3Delete-unexpected';
		const fromNodeBody = createSourceBodyData();
		const fromVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
		const toSystemCode = 'docstore-merge-dest-s3Post-unexpected';
		const toNodeBody = createDestinationBodyData();
		const toVersionMarker = 'ios1J2p4h2MywrrvbfaUts.B3JbAQe2V';

		const { stubGet, stubPost, stubDelete, s3Instance } = mockS3Merge(
			{ fromSystemCode, fromNodeBody, fromVersionMarker },
			{ toSystemCode, toNodeBody, toVersionMarker },
		);

		const store = docstore(s3Instance);
		await expect(
			store.merge(consistentNodeType, fromSystemCode, toSystemCode),
		).rejects.toThrow(Error);

		expect(stubGet).toHaveBeenCalledTimes(2);
		[
			matcher(s3Instance, fromSystemCode),
			matcher(s3Instance, toSystemCode),
		].forEach((match, index) => {
			// Nth starts with 1 so we use index with adding 1
			expect(stubGet).toHaveBeenNthCalledWith(index + 1, match);
		});

		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith(
			matcher(s3Instance, fromSystemCode),
		);

		expect(stubPost).toHaveBeenCalledTimes(1);
		expect(stubPost).toHaveBeenCalledWith(
			matcher(
				s3Instance,
				toSystemCode,
				Object.assign({}, toNodeBody, fromNodeBody),
			),
		);
	});

	test('only deletes source version when objects are same between source and destination', async () => {
		const fromSystemCode = 'docstore-merge-src';
		const fromNodeBody = createDestinationBodyData();
		const fromVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
		const toSystemCode = 'docstore-merge-dest';
		const toNodeBody = createDestinationBodyData();
		const toVersionMarker = 'ios1J2p4h2MywrrvbfaUts.B3JbAQe2V';

		const {
			stubGet,
			stubPost,
			stubDelete,
			stubUploadOnUndo,
			s3Instance,
		} = mockS3Merge(
			{ fromSystemCode, fromNodeBody, fromVersionMarker },
			{ toSystemCode, toNodeBody, toVersionMarker },
		);

		const store = docstore(s3Instance);
		const result = await store.merge(
			consistentNodeType,
			fromSystemCode,
			toSystemCode,
		);

		expect(result).toMatchObject({
			versionMarker: undefined,
			siblingVersionMarker: fromVersionMarker,
			body: toNodeBody,
			undo: expect.any(Function),
		});

		expect(stubGet).toHaveBeenCalledTimes(2);
		[
			matcher(s3Instance, fromSystemCode),
			matcher(s3Instance, toSystemCode),
		].forEach((match, index) => {
			// Nth starts with 1 so we use index with adding 1
			expect(stubGet).toHaveBeenNthCalledWith(index + 1, match);
		});

		// s3Post won't be called because there are no difference between source and destination
		expect(stubPost).not.toHaveBeenCalled();

		// s3Delete should be called for deleting source node
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith(
			matcher(s3Instance, fromSystemCode),
		);

		// can undo only in delete
		const undoResult = await result.undo();
		expect(undoResult).toMatchObject({
			versionMarker: null,
			siblingVersionMarker: fromVersionMarker,
		});
		expect(stubUploadOnUndo).toHaveBeenCalledWith(
			s3CallMatcher(fromSystemCode, null, createDestinationBodyData()),
		);
	});
});
