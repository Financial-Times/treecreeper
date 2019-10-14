jest.mock('../post');
jest.mock('../get');
jest.mock('../delete');

const { createS3Instance } = require('../s3');
const { docstore } = require('..');
const postModule = require('../post');
const getModule = require('../get');
const deleteModule = require('../delete');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;

const createSourceBodyData = () => ({
	extraField: 'willBeMerged',
});

const createDestinationBodyData = () => ({
	firstLineTroubleshooting: 'firstLineTroubleshooting',
	moreInformation: 'moreInformation',
	monitoring: 'monitoring',
	architectureDiagram: 'architectureDiagram',
});

const mockS3Merge = (
	{ fromSystemCode, fromNodeBody, fromVersionMarker },
	{ toSystemCode, toNodeBody, toVersionMarker },
) => {
	// s3Merge depends on s3Get, s3Delete and s3Post module so we create stub for them
	// When 'post-unexpected' word is included on provided system code (e,g `docstore-merge-test-post-unexpected`), then we'll throw error
	const stubPost = jest
		.spyOn(postModule, 's3Post')
		.mockImplementation(async ({ code, body }) => {
			if (code.indexOf('post-unexpected') !== -1) {
				throw new Error('unexpected error');
			}
			// need waiting for resolve in order to test parallel asynchronous processing properly
			// await wait(200);

			return {
				versionMarker: toVersionMarker,
				body,
			};
		});

	const stubGet = jest
		.spyOn(getModule, 's3Get')
		.mockImplementation(({ code }) => {
			switch (code) {
				case fromSystemCode:
					return {
						body: fromNodeBody,
					};
				case toSystemCode:
					return {
						body: toNodeBody,
					};
				default:
					throw new Error('unexpected systen code');
			}
		});

	// When 'delete-unexpected' word is included on provided system code (e,g `docstore-merge-test-unexpected`), then we'll throw error
	const stubDelete = jest
		.spyOn(deleteModule, 's3Delete')
		.mockImplementation(async ({ code }) => {
			// need waiting for resolve in order to test parallel asynchronous processing properly
			// await wait(100);

			switch (code) {
				case fromSystemCode:
					if (fromSystemCode.indexOf('delete-unexpected') !== -1) {
						throw new Error('unexpected error');
					}
					return {
						versionMarker: fromVersionMarker,
					};
				case toSystemCode:
					if (toSystemCode.indexOf('delete-unexpected') !== -1) {
						throw new Error('unexpected error');
					}
					return {
						versionMarker: toVersionMarker,
					};
				default:
					throw new Error('unexpected systen code');
			}
		});

	return {
		s3Instance: createS3Instance({
			accessKeyId: 'testAccessKeyId',
			secretAccessKey: 'testSecretAccessKey',
		}),
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

	test('returns with merged object, posted version and deleted version', async () => {
		const givenNodeType = 'System';
		const fromSystemCode = 'docstore-merge-src';
		const fromNodeBody = createSourceBodyData();
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
			givenNodeType,
			fromSystemCode,
			toSystemCode,
		);

		expect(result).toMatchObject({
			versionMarker: toVersionMarker,
			siblingVersionMarker: fromVersionMarker,
			body: Object.assign({}, toNodeBody, fromNodeBody),
		});

		expect(stubGet).toHaveBeenCalledTimes(2);
		expect(stubGet).toHaveBeenNthCalledWith(1, {
			s3Instance,
			bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
			nodeType: givenNodeType,
			code: fromSystemCode,
		});
		expect(stubGet).toHaveBeenNthCalledWith(2, {
			s3Instance,
			bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
			nodeType: givenNodeType,
			code: toSystemCode,
		});

		expect(stubPost).toHaveBeenCalledTimes(1);
		expect(stubPost).toHaveBeenCalledWith({
			s3Instance,
			bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
			nodeType: givenNodeType,
			code: toSystemCode,
			body: Object.assign({}, toNodeBody, fromNodeBody),
		});
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith({
			s3Instance,
			bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
			nodeType: givenNodeType,
			code: fromSystemCode,
		});
	});

	test('returns empty object when source node body it empty', async () => {
		const givenNodeType = 'System';
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
			givenNodeType,
			fromSystemCode,
			toSystemCode,
		);

		expect(stubGet).toHaveBeenCalledTimes(2);
		expect(stubGet).toHaveBeenNthCalledWith(1, {
			s3Instance,
			bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
			nodeType: givenNodeType,
			code: fromSystemCode,
		});
		expect(stubGet).toHaveBeenNthCalledWith(2, {
			s3Instance,
			bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
			nodeType: givenNodeType,
			code: toSystemCode,
		});

		expect(stubPost).not.toHaveBeenCalled();
		expect(stubDelete).not.toHaveBeenCalled();
		expect(Object.keys(result)).toHaveLength(0);
	});

	test('throws error when delete and post fail', async () => {
		const givenNodeType = 'System';
		const fromSystemCode = 'docstore-merge-src-delete-unexpected';
		const fromNodeBody = createSourceBodyData();
		const fromVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
		const toSystemCode = 'docstore-merge-dest-post-unexpected';
		const toNodeBody = createDestinationBodyData();
		const toVersionMarker = 'ios1J2p4h2MywrrvbfaUts.B3JbAQe2V';

		const { stubGet, stubPost, stubDelete, s3Instance } = mockS3Merge(
			{ fromSystemCode, fromNodeBody, fromVersionMarker },
			{ toSystemCode, toNodeBody, toVersionMarker },
		);

		const store = docstore(s3Instance);
		await expect(
			store.merge(givenNodeType, fromSystemCode, toSystemCode),
		).rejects.toThrow(Error);

		expect(stubGet).toHaveBeenCalledTimes(2);
		expect(stubGet).toHaveBeenNthCalledWith(1, {
			s3Instance,
			bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
			nodeType: givenNodeType,
			code: fromSystemCode,
		});
		expect(stubGet).toHaveBeenNthCalledWith(2, {
			s3Instance,
			bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
			nodeType: givenNodeType,
			code: toSystemCode,
		});

		expect(stubPost).toHaveBeenCalledTimes(1);
		expect(stubPost).toHaveBeenCalledWith({
			s3Instance,
			bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
			nodeType: givenNodeType,
			code: toSystemCode,
			body: Object.assign({}, toNodeBody, fromNodeBody),
		});
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith({
			s3Instance,
			bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
			nodeType: givenNodeType,
			code: fromSystemCode,
		});
	});

	test('only updates a version when objects are same', async () => {
		const givenNodeType = 'System';
		const fromSystemCode = 'docstore-merge-src';
		const fromNodeBody = createDestinationBodyData();
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
			givenNodeType,
			fromSystemCode,
			toSystemCode,
		);

		expect(result).toMatchObject({
			versionMarker: undefined,
			siblingVersionMarker: fromVersionMarker,
			body: toNodeBody,
		});

		expect(stubGet).toHaveBeenCalledTimes(2);
		expect(stubGet).toHaveBeenNthCalledWith(1, {
			s3Instance,
			bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
			nodeType: givenNodeType,
			code: fromSystemCode,
		});
		expect(stubGet).toHaveBeenNthCalledWith(2, {
			s3Instance,
			bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
			nodeType: givenNodeType,
			code: toSystemCode,
		});

		// s3Post won't be called because there are no difference between source and destination
		expect(stubPost).not.toHaveBeenCalled();

		// s3Delete should be called for deleting source node
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith({
			s3Instance,
			bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
			nodeType: givenNodeType,
			code: fromSystemCode,
		});
	});
});
