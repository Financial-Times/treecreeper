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
const { undo } = require('../undo');
const {
	s3DeleteObjectResponseFixture,
	createExampleBodyData,
} = require('../__fixtures__/s3-object-fixture');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;
const consistentNodeType = 'System';

const createSourceBodyData = () => ({
	extraField: 'willBeAbsorbed',
});

const createDestinationBodyData = () => createExampleBodyData();

const createStub = (module, method, valueMap) => {
	const rejectKeyword = `${method}-unexpected`;

	return jest.spyOn(module, method).mockImplementation(async ({ code }) => {
		if (!(code in valueMap)) {
			throw new Error(`unexpected system code ${code} is provided.`);
		}
		const response = valueMap[code];
		if (code.indexOf(rejectKeyword) !== -1) {
			return response.rejected || {};
		}
		return response.resolved;
	});
};

const mockS3Absorb = (
	{ absorbedSystemCode, absorbedNodeBody, absorbedVersionMarker },
	{ rootSystemCode, rootNodeBody, rootVersionMarker },
) => {
	const stubDeleteOnUndo = jest.fn(({ Key }) => {
		const resolveData =
			Key === `${consistentNodeType}/${absorbedSystemCode}`
				? s3DeleteObjectResponseFixture(absorbedVersionMarker)
				: s3DeleteObjectResponseFixture(rootVersionMarker);
		return {
			promise: jest.fn().mockImplementation(async () => resolveData),
		};
	});

	S3.mockImplementation(() => ({
		deleteObject: stubDeleteOnUndo,
	}));

	// We need to create S3 instance here in order to use mocked instance
	const s3Instance = createS3Instance({
		accessKeyId: 'testAccessKeyId',
		secretAccessKey: 'testSecretAccessKey',
	});

	// s3Merge depends on s3Get, s3Delete and s3Post module so we create stub for them
	// When 'post-unexpected' word is included on provided system code (e,g `docstore-absorb-test-post-unexpected`), then we'll throw error
	const stubPost = jest
		.spyOn(postModule, 's3Post')
		.mockImplementation(async ({ code, body }) => {
			if (code.indexOf('s3Post-unexpected') !== -1) {
				throw new Error('unexpected error');
			}
			return {
				versionMarker: rootVersionMarker,
				body,
				undo: undo({
					s3Instance,
					bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
					type: consistentNodeType,
					code,
					versionMarker: rootVersionMarker,
				}),
			};
		});

	const stubGet = createStub(getModule, 's3Get', {
		[absorbedSystemCode]: {
			resolved: { body: absorbedNodeBody },
		},
		[rootSystemCode]: {
			resolved: { body: rootNodeBody },
		},
	});
	const stubDelete = createStub(deleteModule, 's3Delete', {
		[absorbedSystemCode]: {
			resolved: {
				versionMarker: absorbedVersionMarker,
				undo: undo({
					s3Instance,
					bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
					type: consistentNodeType,
					code: absorbedSystemCode,
					versionMarker: absorbedVersionMarker,
					undoType: 'DELETE',
				}),
			},
			rejected: {
				versionMarker: null,
			},
		},
		[rootSystemCode]: {
			resolved: {
				versionMarker: rootVersionMarker,
				undo: undo({
					s3Instance,
					bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
					type: consistentNodeType,
					code: rootSystemCode,
					versionMarker: rootVersionMarker,
					undoType: 'DELETE',
				}),
			},
			rejected: {
				versionMarker: null,
			},
		},
	});

	return {
		s3Instance,
		stubGet,
		stubPost,
		stubDelete,
		stubDeleteOnUndo,
	};
};

describe('S3 document helper absorb', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	const matcher = (s3Instance, code, body) => ({
		s3Instance,
		bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
		type: consistentNodeType,
		code,
		...(body ? { body } : {}),
	});

	const s3CallMatcher = (code, versionMarker) => ({
		Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
		Key: `${consistentNodeType}/${code}`,
		...(versionMarker ? { VersionId: versionMarker } : {}),
	});

	test('returns with absorbed object, posted version, deleted version and undo function', async () => {
		const absorbedSystemCode = 'docstore-absorb-src';
		const absorbedNodeBody = createSourceBodyData();
		const absorbedVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
		const rootSystemCode = 'docstore-absorb-dest';
		const rootNodeBody = createDestinationBodyData();
		const rootVersionMarker = 'ios1J2p4h2MywrrvbfaUts.B3JbAQe2V';

		const {
			stubGet,
			stubPost,
			stubDelete,
			stubDeleteOnUndo,
			s3Instance,
		} = mockS3Absorb(
			{ absorbedSystemCode, absorbedNodeBody, absorbedVersionMarker },
			{ rootSystemCode, rootNodeBody, rootVersionMarker },
		);

		const store = docstore(s3Instance);

		const result = await store.absorb(
			consistentNodeType,
			absorbedSystemCode,
			rootSystemCode,
		);

		expect(result).toMatchObject({
			versionMarker: rootVersionMarker,
			siblingVersionMarker: absorbedVersionMarker,
			body: { ...rootNodeBody, ...absorbedNodeBody },
			undo: expect.any(Function),
		});

		expect(stubGet).toHaveBeenCalledTimes(2);
		[
			matcher(s3Instance, absorbedSystemCode),
			matcher(s3Instance, rootSystemCode),
		].forEach((match, index) => {
			// Nth starts with 1 so we use index with adding 1
			expect(stubGet).toHaveBeenNthCalledWith(index + 1, match);
		});

		expect(stubPost).toHaveBeenCalledTimes(1);
		expect(stubPost).toHaveBeenCalledWith(
			matcher(s3Instance, rootSystemCode, {
				...rootNodeBody,
				...absorbedNodeBody,
			}),
		);
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith(
			matcher(s3Instance, absorbedSystemCode),
		);

		const undoResult = await result.undo();
		expect(undoResult).toMatchObject({
			versionMarker: result.versionMarker,
			siblingVersionMarker: result.siblingVersionMarker,
		});
		// undo absorb
		expect(stubDeleteOnUndo).toHaveBeenCalledTimes(2);
		[
			s3CallMatcher(rootSystemCode, result.versionMarker),
			s3CallMatcher(absorbedSystemCode, result.siblingVersionMarker),
		].forEach((match, index) => {
			expect(stubDeleteOnUndo).toHaveBeenNthCalledWith(index + 1, match);
		});
	});

	describe('merge behaviour', () => {
		const testMergedProperties = async ({
			rootBody,
			absorbedBody,
			expectedBody,
		}) => {
			const absorbedSystemCode = 'docstore-absorb-src';
			const absorbedNodeBody = absorbedBody;
			const absorbedVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
			const rootSystemCode = 'docstore-absorb-dest';
			const rootNodeBody = rootBody;
			const rootVersionMarker = 'ios1J2p4h2MywrrvbfaUts.B3JbAQe2V';

			const { stubPost, s3Instance } = mockS3Absorb(
				{ absorbedSystemCode, absorbedNodeBody, absorbedVersionMarker },
				{ rootSystemCode, rootNodeBody, rootVersionMarker },
			);

			const store = docstore(s3Instance);

			const result = await store.absorb(
				consistentNodeType,
				absorbedSystemCode,
				rootSystemCode,
			);

			expect(result).toMatchObject({
				body: expectedBody,
			});

			expect(stubPost).toHaveBeenCalledTimes(1);
			expect(stubPost).toHaveBeenCalledWith(
				matcher(s3Instance, rootSystemCode, expectedBody),
			);
		};

		it('Leaves property unchanged when only defined on root', async () => {
			return testMergedProperties({
				rootBody: { someDocument: 'some document' },
				absorbedBody: { anotherDocument: 'absorbed another document' },
				expectedBody: {
					someDocument: 'some document',
					anotherDocument: 'absorbed another document',
				},
			});
		});

		it('Writes property when only defined on absorbed', async () => {
			return testMergedProperties({
				rootBody: {},
				absorbedBody: { anotherDocument: 'absorbed another document' },
				expectedBody: { anotherDocument: 'absorbed another document' },
			});
		});

		it('Leaves property unchanged when defined on both', async () => {
			return testMergedProperties({
				rootBody: { someDocument: 'some document' },
				absorbedBody: {
					someDocument: 'absorbed some document',
					anotherDocument: 'absorbed another document',
				},
				expectedBody: {
					someDocument: 'some document',
					anotherDocument: 'absorbed another document',
				},
			});
		});
	});

	test('returns empty object when source node body is empty', async () => {
		const absorbedSystemCode = 'docstore-absorb-src';
		const absorbedNodeBody = {};
		const absorbedVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
		const rootSystemCode = 'docstore-absorb-dest';
		const rootNodeBody = createDestinationBodyData();
		const rootVersionMarker = 'ios1J2p4h2MywrrvbfaUts.B3JbAQe2V';

		const { stubGet, stubPost, stubDelete, s3Instance } = mockS3Absorb(
			{ absorbedSystemCode, absorbedNodeBody, absorbedVersionMarker },
			{ rootSystemCode, rootNodeBody, rootVersionMarker },
		);

		const store = docstore(s3Instance);

		const result = await store.absorb(
			consistentNodeType,
			absorbedSystemCode,
			rootSystemCode,
		);

		expect(stubGet).toHaveBeenCalledTimes(2);
		[
			matcher(s3Instance, absorbedSystemCode),
			matcher(s3Instance, rootSystemCode),
		].forEach((match, index) => {
			// Nth starts with 1 so we use index with adding 1
			expect(stubGet).toHaveBeenNthCalledWith(index + 1, match);
		});

		expect(stubPost).not.toHaveBeenCalled();
		expect(stubDelete).not.toHaveBeenCalled();
		expect(Object.keys(result)).toHaveLength(0);
	});

	test('throws error when delete and post fail', async () => {
		const absorbedSystemCode = 'docstore-absorb-src-s3Delete-unexpected';
		const absorbedNodeBody = createSourceBodyData();
		const absorbedVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
		const rootSystemCode = 'docstore-absorb-dest-s3Post-unexpected';
		const rootNodeBody = createDestinationBodyData();
		const rootVersionMarker = 'ios1J2p4h2MywrrvbfaUts.B3JbAQe2V';

		const { stubGet, stubPost, stubDelete, s3Instance } = mockS3Absorb(
			{ absorbedSystemCode, absorbedNodeBody, absorbedVersionMarker },
			{ rootSystemCode, rootNodeBody, rootVersionMarker },
		);

		const store = docstore(s3Instance);
		await expect(
			store.absorb(
				consistentNodeType,
				absorbedSystemCode,
				rootSystemCode,
			),
		).rejects.toThrow(Error);

		expect(stubGet).toHaveBeenCalledTimes(2);
		[
			matcher(s3Instance, absorbedSystemCode),
			matcher(s3Instance, rootSystemCode),
		].forEach((match, index) => {
			// Nth starts with 1 so we use index with adding 1
			expect(stubGet).toHaveBeenNthCalledWith(index + 1, match);
		});

		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith(
			matcher(s3Instance, absorbedSystemCode),
		);

		expect(stubPost).toHaveBeenCalledTimes(1);
		expect(stubPost).toHaveBeenCalledWith(
			matcher(s3Instance, rootSystemCode, {
				...rootNodeBody,
				...absorbedNodeBody,
			}),
		);
	});

	test('throws error when post destination body fail', async () => {
		const absorbedSystemCode = 'docstore-absorb-src';
		const absorbedNodeBody = createSourceBodyData();
		const absorbedVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
		const rootSystemCode = 'docstore-absorb-dest-s3Post-unexpected';
		const rootNodeBody = createDestinationBodyData();
		const rootVersionMarker = 'ios1J2p4h2MywrrvbfaUts.B3JbAQe2V';

		const {
			stubGet,
			stubPost,
			stubDelete,
			stubDeleteOnUndo,
			s3Instance,
		} = mockS3Absorb(
			{ absorbedSystemCode, absorbedNodeBody, absorbedVersionMarker },
			{ rootSystemCode, rootNodeBody, rootVersionMarker },
		);

		const store = docstore(s3Instance);
		await expect(
			store.absorb(
				consistentNodeType,
				absorbedSystemCode,
				rootSystemCode,
			),
		).rejects.toThrow(Error);

		expect(stubGet).toHaveBeenCalledTimes(2);
		[
			matcher(s3Instance, absorbedSystemCode),
			matcher(s3Instance, rootSystemCode),
		].forEach((match, index) => {
			// Nth starts with 1 so we use index with adding 1
			expect(stubGet).toHaveBeenNthCalledWith(index + 1, match);
		});

		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith(
			matcher(s3Instance, absorbedSystemCode),
		);

		expect(stubPost).toHaveBeenCalledTimes(1);
		expect(stubPost).toHaveBeenCalledWith(
			matcher(s3Instance, rootSystemCode, {
				...rootNodeBody,
				...absorbedNodeBody,
			}),
		);
		expect(stubDeleteOnUndo).toHaveBeenCalledTimes(1);
		expect(stubDeleteOnUndo).toHaveBeenCalledWith(
			s3CallMatcher(absorbedSystemCode, absorbedVersionMarker),
		);
	});

	test('throws error when delete source body fail', async () => {
		const absorbedSystemCode = 'docstore-absorb-src-s3Delete-unexpected';
		const absorbedNodeBody = createSourceBodyData();
		const absorbedVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
		const rootSystemCode = 'docstore-absorb-dest';
		const rootNodeBody = createDestinationBodyData();
		const rootVersionMarker = 'ios1J2p4h2MywrrvbfaUts.B3JbAQe2V';

		const {
			stubGet,
			stubPost,
			stubDelete,
			stubDeleteOnUndo,
			s3Instance,
		} = mockS3Absorb(
			{ absorbedSystemCode, absorbedNodeBody, absorbedVersionMarker },
			{ rootSystemCode, rootNodeBody, rootVersionMarker },
		);

		const store = docstore(s3Instance);
		await expect(
			store.absorb(
				consistentNodeType,
				absorbedSystemCode,
				rootSystemCode,
			),
		).rejects.toThrow(Error);

		expect(stubGet).toHaveBeenCalledTimes(2);
		[
			matcher(s3Instance, absorbedSystemCode),
			matcher(s3Instance, rootSystemCode),
		].forEach((match, index) => {
			// Nth starts with 1 so we use index with adding 1
			expect(stubGet).toHaveBeenNthCalledWith(index + 1, match);
		});

		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith(
			matcher(s3Instance, absorbedSystemCode),
		);

		expect(stubPost).toHaveBeenCalledTimes(1);
		expect(stubPost).toHaveBeenCalledWith(
			matcher(s3Instance, rootSystemCode, {
				...rootNodeBody,
				...absorbedNodeBody,
			}),
		);
		expect(stubDeleteOnUndo).toHaveBeenCalledTimes(1);
		expect(stubDeleteOnUndo).toHaveBeenCalledWith(
			s3CallMatcher(rootSystemCode, rootVersionMarker),
		);
	});

	test('only deletes source version when objects are same between source and destination', async () => {
		const absorbedSystemCode = 'docstore-absorb-src';
		const absorbedNodeBody = createDestinationBodyData();
		const absorbedVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
		const rootSystemCode = 'docstore-absorb-dest';
		const rootNodeBody = createDestinationBodyData();
		const rootVersionMarker = 'ios1J2p4h2MywrrvbfaUts.B3JbAQe2V';

		const {
			stubGet,
			stubPost,
			stubDelete,
			stubDeleteOnUndo,
			s3Instance,
		} = mockS3Absorb(
			{ absorbedSystemCode, absorbedNodeBody, absorbedVersionMarker },
			{ rootSystemCode, rootNodeBody, rootVersionMarker },
		);

		const store = docstore(s3Instance);
		const result = await store.absorb(
			consistentNodeType,
			absorbedSystemCode,
			rootSystemCode,
		);

		expect(result).toMatchObject({
			versionMarker: undefined,
			siblingVersionMarker: absorbedVersionMarker,
			body: rootNodeBody,
			undo: expect.any(Function),
		});

		expect(stubGet).toHaveBeenCalledTimes(2);
		[
			matcher(s3Instance, absorbedSystemCode),
			matcher(s3Instance, rootSystemCode),
		].forEach((match, index) => {
			// Nth starts with 1 so we use index with adding 1
			expect(stubGet).toHaveBeenNthCalledWith(index + 1, match);
		});

		// s3Post won't be called because there are no difference between source and destination
		expect(stubPost).not.toHaveBeenCalled();

		// s3Delete should be called for deleting source node
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith(
			matcher(s3Instance, absorbedSystemCode),
		);

		// can undo only in delete
		const undoResult = await result.undo();
		expect(undoResult).toMatchObject({
			versionMarker: null,
			siblingVersionMarker: absorbedVersionMarker,
		});
		expect(stubDeleteOnUndo).toHaveBeenCalledWith(
			s3CallMatcher(absorbedSystemCode, absorbedVersionMarker),
		);
	});
});
