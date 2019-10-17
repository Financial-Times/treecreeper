jest.mock('../post');
jest.mock('../get');
jest.mock('../delete');

const { createS3Instance } = require('../s3');
const { docstore } = require('..');
const postModule = require('../post');
const getModule = require('../get');
const deleteModule = require('../delete');
const { createExampleBodyData } = require('../__fixtures__/s3-object-fixture');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;

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
			};
		});

	const stubGet = createStub(getModule, 's3Get', {
		[fromSystemCode]: { body: fromNodeBody },
		[toSystemCode]: { body: toNodeBody },
	});
	const stubDelete = createStub(deleteModule, 's3Delete', {
		[fromSystemCode]: { versionMarker: fromVersionMarker },
		[toSystemCode]: { versionMarker: toVersionMarker },
	});

	return {
		stubGet,
		stubPost,
		stubDelete,
	};
};

describe('S3 document helper merge', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	const consistentNodeType = 'System';

	const s3Instance = createS3Instance({
		accessKeyId: 'testAccessKeyId',
		secretAccessKey: 'testSecretAccessKey',
	});

	const matcher = (code, body) => ({
		s3Instance,
		bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
		nodeType: consistentNodeType,
		code,
		...(body ? { body } : {}),
	});

	test('returns with merged object, posted version and deleted version', async () => {
		const fromSystemCode = 'docstore-merge-src';
		const fromNodeBody = createSourceBodyData();
		const fromVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
		const toSystemCode = 'docstore-merge-dest';
		const toNodeBody = createDestinationBodyData();
		const toVersionMarker = 'ios1J2p4h2MywrrvbfaUts.B3JbAQe2V';

		const { stubGet, stubPost, stubDelete } = mockS3Merge(
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
		});

		expect(stubGet).toHaveBeenCalledTimes(2);
		expect(stubGet).toHaveBeenNthCalledWith(1, matcher(fromSystemCode));
		expect(stubGet).toHaveBeenNthCalledWith(2, matcher(toSystemCode));

		expect(stubPost).toHaveBeenCalledTimes(1);
		expect(stubPost).toHaveBeenCalledWith(
			matcher(toSystemCode, Object.assign({}, toNodeBody, fromNodeBody)),
		);
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith(matcher(fromSystemCode));
	});

	test('returns empty object when source node body it empty', async () => {
		const fromSystemCode = 'docstore-merge-src';
		const fromNodeBody = {};
		const fromVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
		const toSystemCode = 'docstore-merge-dest';
		const toNodeBody = createDestinationBodyData();
		const toVersionMarker = 'ios1J2p4h2MywrrvbfaUts.B3JbAQe2V';

		const { stubGet, stubPost, stubDelete } = mockS3Merge(
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
		expect(stubGet).toHaveBeenNthCalledWith(1, matcher(fromSystemCode));
		expect(stubGet).toHaveBeenNthCalledWith(2, matcher(toSystemCode));

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

		const { stubGet, stubPost, stubDelete } = mockS3Merge(
			{ fromSystemCode, fromNodeBody, fromVersionMarker },
			{ toSystemCode, toNodeBody, toVersionMarker },
		);

		const store = docstore(s3Instance);
		await expect(
			store.merge(consistentNodeType, fromSystemCode, toSystemCode),
		).rejects.toThrow(Error);

		expect(stubGet).toHaveBeenCalledTimes(2);
		expect(stubGet).toHaveBeenNthCalledWith(1, matcher(fromSystemCode));
		expect(stubGet).toHaveBeenNthCalledWith(2, matcher(toSystemCode));

		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith(matcher(fromSystemCode));

		expect(stubPost).toHaveBeenCalledTimes(1);
		expect(stubPost).toHaveBeenCalledWith(
			matcher(toSystemCode, Object.assign({}, toNodeBody, fromNodeBody)),
		);
	});

	test('only updates a version when objects are same', async () => {
		const fromSystemCode = 'docstore-merge-src';
		const fromNodeBody = createDestinationBodyData();
		const fromVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
		const toSystemCode = 'docstore-merge-dest';
		const toNodeBody = createDestinationBodyData();
		const toVersionMarker = 'ios1J2p4h2MywrrvbfaUts.B3JbAQe2V';

		const { stubGet, stubPost, stubDelete } = mockS3Merge(
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
		});

		expect(stubGet).toHaveBeenCalledTimes(2);
		expect(stubGet).toHaveBeenNthCalledWith(1, matcher(fromSystemCode));
		expect(stubGet).toHaveBeenNthCalledWith(2, matcher(toSystemCode));

		// s3Post won't be called because there are no difference between source and destination
		expect(stubPost).not.toHaveBeenCalled();

		// s3Delete should be called for deleting source node
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith(matcher(fromSystemCode));
	});
});
