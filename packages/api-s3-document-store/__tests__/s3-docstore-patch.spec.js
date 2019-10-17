jest.mock('aws-sdk');
jest.mock('../upload');
jest.mock('../get');

const { S3 } = require('aws-sdk');
const { createS3Instance } = require('../s3');
const { docstore } = require('..');
const uploadModule = require('../upload');
const getModule = require('../get');
const {
	s3DeleteObjectResponseFixture,
	createExampleBodyData,
} = require('../__fixtures__/s3-object-fixture');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;

const createStub = (module, method, resolvedValue) =>
	jest.spyOn(module, method).mockResolvedValue(resolvedValue);

const mockS3Patch = versionMarker => {
	// s3Patch depends on s3Get and upload module so we create stub for them
	const stubUpload = createStub(uploadModule, 'upload', versionMarker);
	const stubGetObject = createStub(getModule, 's3Get', {
		body: createExampleBodyData(),
	});
	const stubDeleteOnUndo = jest.fn().mockReturnValue({
		promise: jest
			.fn()
			.mockResolvedValue(s3DeleteObjectResponseFixture(versionMarker)),
	});

	S3.mockImplementation(() => ({
		deleteObject: stubDeleteOnUndo,
	}));

	return {
		// We need to create S3 instance here in order to use mocked instance
		s3Instance: createS3Instance({
			accessKeyId: 'testAccessKeyId',
			secretAccessKey: 'testSecretAccessKey',
		}),
		stubUpload,
		stubGetObject,
		stubDeleteOnUndo,
	};
};

describe('S3 document helper patch', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	const consistentNodeType = 'System';

	const matcher = (s3Instance, systemCode) => ({
		s3Instance,
		bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
		nodeType: consistentNodeType,
		code: systemCode,
	});

	test('returns existing body object when patch object is completely same', async () => {
		const givenSystemCode = 'docstore-patch-test';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const { stubUpload, stubGetObject, s3Instance } = mockS3Patch(
			givenVersionMarker,
		);
		const store = docstore(s3Instance);
		const expectedData = createExampleBodyData();

		const result = await store.patch(
			consistentNodeType,
			givenSystemCode,
			expectedData,
		);

		expect(result).toMatchObject({
			body: expectedData,
		});
		// result SHOULD NOT have versionMarker and undo property
		expect(result).not.toHaveProperty('versionMarker');
		expect(result).not.toHaveProperty('undo');
		expect(stubUpload).not.toHaveBeenCalled();
		expect(stubGetObject).toHaveBeenCalled();
		expect(stubGetObject).toHaveBeenCalledWith(
			matcher(s3Instance, givenSystemCode),
		);
	});

	test('returns patched body with new versionMakrer and undo function', async () => {
		const givenSystemCode = 'docstore-patch-test';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const {
			stubUpload,
			stubGetObject,
			stubDeleteOnUndo,
			s3Instance,
		} = mockS3Patch(givenVersionMarker);
		const store = docstore(s3Instance);
		const expectedData = createExampleBodyData();

		const patchBody = {
			extraField: 'will be patched',
		};
		const result = await store.patch(
			consistentNodeType,
			givenSystemCode,
			patchBody,
		);

		const expectedBody = Object.assign({}, expectedData, patchBody);
		const callParams = {
			Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
			Key: `${consistentNodeType}/${givenSystemCode}`,
			Body: JSON.stringify(expectedBody),
		};

		expect(result).toMatchObject({
			versionMarker: givenVersionMarker,
			body: expectedBody,
			undo: expect.any(Function),
		});
		expect(stubUpload).toHaveBeenCalled();
		expect(stubUpload).toHaveBeenCalledWith({
			s3Instance,
			params: callParams,
			requestType: 'PATCH',
		});
		expect(stubGetObject).toHaveBeenCalled();
		expect(stubGetObject).toHaveBeenCalledWith(
			matcher(s3Instance, givenSystemCode),
		);

		const undoResult = await result.undo();
		expect(undoResult).toMatchObject({
			versionMarker: givenVersionMarker,
		});
		expect(stubDeleteOnUndo).toHaveBeenCalledWith({
			Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
			Key: `${consistentNodeType}/${givenSystemCode}`,
			VersionId: givenVersionMarker,
		});
	});
});
