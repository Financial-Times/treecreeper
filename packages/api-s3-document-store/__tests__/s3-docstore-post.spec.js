jest.mock('aws-sdk');
jest.mock('../upload');

const { S3 } = require('aws-sdk');
const { createS3Instance } = require('../s3');
const { docstore } = require('..');
const uploadModule = require('../upload');
const {
	s3DeleteObjectResponseFixture,
	createExampleBodyData,
} = require('../__fixtures__/s3-object-fixture');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;

const mockS3Post = versionMarker => {
	// s3Post depends on upload module so we create stub for upload module
	const stubUpload = jest
		.spyOn(uploadModule, 'upload')
		.mockResolvedValue(versionMarker);

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
		stubDeleteOnUndo,
	};
};

describe('S3 document helper post', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	const consistentNodeType = 'System';

	test('returns exact uploaded body, versionMarker and undo function which can call it', async () => {
		const givenSystemCode = 'docstore-post-test';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const { stubUpload, stubDeleteOnUndo, s3Instance } = mockS3Post(
			givenVersionMarker,
		);
		const store = docstore(s3Instance);
		const exampleData = createExampleBodyData();

		const result = await store.post(
			consistentNodeType,
			givenSystemCode,
			exampleData,
		);

		const callParams = {
			Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
			Key: `${consistentNodeType}/${givenSystemCode}`,
			Body: JSON.stringify(exampleData),
		};

		expect(stubUpload).toHaveBeenCalledTimes(1);
		expect(stubUpload).toHaveBeenCalledWith({
			s3Instance,
			params: callParams,
			requestType: 'POST',
		});
		expect(result).toMatchObject({
			versionMarker: givenVersionMarker,
			body: exampleData,
			undo: expect.any(Function),
		});
		const undoResult = await result.undo();
		expect(undoResult).toMatchObject({
			versionMarker: 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar',
		});
		expect(stubDeleteOnUndo).toHaveBeenCalledWith({
			Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
			Key: `${consistentNodeType}/${givenSystemCode}`,
			VersionId: givenVersionMarker,
		});
	});
});
