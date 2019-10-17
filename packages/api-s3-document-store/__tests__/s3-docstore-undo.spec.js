jest.mock('aws-sdk');
const { S3 } = require('aws-sdk');

const { createS3Instance } = require('../s3');
const { undoCreate, undoDelete } = require('../undo');
const {
	s3DeleteObjectResponseFixture,
	s3UploadResponseFixture,
} = require('../__fixtures__/s3-object-fixture');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;
const consistentNodeType = 'System';

const mockUndo = (systemCode, versionMarker) => {
	let deletePromise = jest.fn();
	let uploadPromise = jest.fn();

	if (systemCode === 'docstore-undo-test') {
		deletePromise = deletePromise.mockResolvedValue(
			s3DeleteObjectResponseFixture(versionMarker),
		);
		uploadPromise = uploadPromise.mockResolvedValue(
			s3UploadResponseFixture(
				TREECREEPER_DOCSTORE_S3_BUCKET,
				`${consistentNodeType}/${systemCode}`,
				versionMarker,
			),
		);
	} else {
		deletePromise = deletePromise.mockRejectedValue(
			new Error('something went wrong on delete'),
		);
		uploadPromise = uploadPromise.mockRejectedValue(
			new Error('something went wrong on delete'),
		);
	}

	const stubDeleteObject = jest.fn().mockReturnValue({
		promise: deletePromise,
	});
	const stubUpload = jest.fn().mockReturnValue({
		promise: uploadPromise,
	});

	S3.mockImplementation(() => ({
		deleteObject: stubDeleteObject,
		upload: stubUpload,
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
		stubUpload,
		undoCreateFunction: undoCreate(undoParams),
		undoDeleteFunction: undoDelete(
			Object.assign({}, undoParams, {
				body: { someDocument: 'some document' },
			}),
		),
	};
};

describe('S3 document helper undo (internal function)', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('undoCreate()', () => {
		const matcher = (systemCode, versionMarker) => ({
			Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
			Key: `${consistentNodeType}/${systemCode}`,
			VersionId: versionMarker,
		});

		test('when success, returns versionMarker', async () => {
			const givenSystemCode = 'docstore-undo-test';
			const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

			const { stubDeleteObject, undoCreateFunction } = mockUndo(
				givenSystemCode,
				givenVersionMarker,
			);

			const result = await undoCreateFunction();

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

			const { stubDeleteObject, undoCreateFunction } = mockUndo(
				givenSystemCode,
				givenVersionMarker,
			);

			await expect(undoCreateFunction()).rejects.toThrow(Error);

			expect(stubDeleteObject).toHaveBeenCalledTimes(1);
			expect(stubDeleteObject).toHaveBeenCalledWith(
				matcher(givenSystemCode, givenVersionMarker),
			);
		});
	});

	describe('undoDelete()', () => {
		const matcher = systemCode => ({
			Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
			Key: `${consistentNodeType}/${systemCode}`,
			Body: JSON.stringify({ someDocument: 'some document' }),
		});

		test('when success, returns versionMarker', async () => {
			const givenSystemCode = 'docstore-undo-test';
			const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

			const { stubUpload, undoDeleteFunction } = mockUndo(
				givenSystemCode,
				givenVersionMarker,
			);

			const result = await undoDeleteFunction();

			expect(result).toMatchObject({
				versionMarker: givenVersionMarker,
			});

			expect(stubUpload).toHaveBeenCalledTimes(1);
			expect(stubUpload).toHaveBeenCalledWith(matcher(givenSystemCode));
		});

		test('throws Error when undo fails', async () => {
			const givenSystemCode = 'docstore-undo-unexpected';
			const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

			const { stubUpload, undoDeleteFunction } = mockUndo(
				givenSystemCode,
				givenVersionMarker,
			);

			await expect(undoDeleteFunction()).rejects.toThrow(Error);

			expect(stubUpload).toHaveBeenCalledTimes(1);
			expect(stubUpload).toHaveBeenCalledWith(matcher(givenSystemCode));
		});
	});
});
