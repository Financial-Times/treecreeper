jest.mock('aws-sdk');
const { S3 } = require('aws-sdk');

const { createS3Instance } = require('../s3');
const { undo } = require('../undo');
const {
	s3DeleteObjectResponseFixture,
} = require('../__fixtures__/s3-object-fixture');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;
const consistentNodeType = 'System';

const mockUndo = (systemCode, versionMarker) => {
	let deletePromise = jest.fn();

	if (systemCode === 'docstore-undo-test') {
		deletePromise = deletePromise.mockResolvedValue(
			s3DeleteObjectResponseFixture(versionMarker),
		);
	} else {
		deletePromise = deletePromise.mockRejectedValue(
			new Error('something went wrong on delete'),
		);
	}

	const stubDeleteObject = jest.fn().mockReturnValue({
		promise: deletePromise,
	});

	S3.mockImplementation(() => ({
		deleteObject: stubDeleteObject,
	}));

	const undoParams = {
		// We need to create S3 instance here in order to use mocked instance
		s3Instance: createS3Instance({
			accessKeyId: 'testAccessKeyId',
			secretAccessKey: 'testSecretAccessKey',
		}),
		bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
		nodeType: consistentNodeType,
		code: systemCode,
		versionMarker,
	};

	return {
		stubDeleteObject,
		undoFunction: undo(undoParams),
	};
};

describe('S3 document helper undo (internal function)', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	const matcher = (systemCode, versionMarker) => ({
		Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
		Key: `${consistentNodeType}/${systemCode}`,
		VersionId: versionMarker,
	});

	test('when success, returns versionMarker', async () => {
		const givenSystemCode = 'docstore-undo-test';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const { stubDeleteObject, undoFunction } = mockUndo(
			givenSystemCode,
			givenVersionMarker,
		);

		const result = await undoFunction();

		expect(result).toMatchObject({
			versionMarker: givenVersionMarker,
		});

		expect(stubDeleteObject).toHaveBeenCalledTimes(1);
		expect(stubDeleteObject).toHaveBeenCalledWith(
			matcher(givenSystemCode, givenVersionMarker),
		);
	});

	test('throws Error when undo fails', async () => {
		const givenSystemCode = 'docstore-undo-unexpected';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const { stubDeleteObject, undoFunction } = mockUndo(
			givenSystemCode,
			givenVersionMarker,
		);

		await expect(undoFunction()).rejects.toThrow(Error);

		expect(stubDeleteObject).toHaveBeenCalledTimes(1);
		expect(stubDeleteObject).toHaveBeenCalledWith(
			matcher(givenSystemCode, givenVersionMarker),
		);
	});
});
