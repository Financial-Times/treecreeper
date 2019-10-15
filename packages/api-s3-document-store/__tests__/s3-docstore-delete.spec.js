jest.mock('aws-sdk');
const { S3 } = require('aws-sdk');

const { createS3Instance } = require('../s3');
const { docstore } = require('..');
const {
	s3DeleteObjectResponseFixture,
} = require('../__fixtures__/s3-object-fixture');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;

const mockS3DeleteObject = (systemCode, versionMarker) => {
	let promiseResult;

	if (systemCode === 'docstore-delete-test') {
		promiseResult = jest
			.fn()
			.mockResolvedValue(s3DeleteObjectResponseFixture(versionMarker));
	} else {
		promiseResult = jest
			.fn()
			.mockRejectedValue(new Error('something went wrong'));
	}

	const stubDeleteObject = jest.fn().mockReturnValue({
		promise: promiseResult,
	});

	S3.mockImplementation(() => ({
		deleteObject: stubDeleteObject,
	}));

	return {
		// We need to create S3 instance here in order to use mocked instance
		s3Instance: createS3Instance({
			accessKeyId: 'testAccessKeyId',
			secretAccessKey: 'testSecretAccessKey',
		}),
		stubDeleteObject,
	};
};

describe('S3 document helper delete', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	const consistentNodeType = 'System';

	const matcher = (systemCode, versionMarker) => ({
		Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
		Key: `${consistentNodeType}/${systemCode}`,
		VersionId: versionMarker,
	});

	test('returns exact versionMarker', async () => {
		const givenSystemCode = 'docstore-delete-test';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const { stubDeleteObject, s3Instance } = mockS3DeleteObject(
			givenSystemCode,
			givenVersionMarker,
		);
		const store = docstore(s3Instance);

		const result = await store.delete(
			consistentNodeType,
			givenSystemCode,
			givenVersionMarker,
		);

		expect(result).toMatchObject({
			versionMarker: givenVersionMarker,
		});

		expect(stubDeleteObject).toHaveBeenCalledTimes(1);
		expect(stubDeleteObject).toHaveBeenCalledWith(
			matcher(givenSystemCode, givenVersionMarker),
		);
	});

	test('returns null versionMarker when delete fails', async () => {
		const givenSystemCode = 'docstore-delete-unexpected';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const { stubDeleteObject, s3Instance } = mockS3DeleteObject(
			givenSystemCode,
			givenVersionMarker,
		);
		const store = docstore(s3Instance);

		const result = await store.delete(
			consistentNodeType,
			givenSystemCode,
			givenVersionMarker,
		);

		expect(result).toMatchObject({
			versionMarker: null,
		});

		expect(stubDeleteObject).toHaveBeenCalledTimes(1);
		expect(stubDeleteObject).toHaveBeenCalledWith(
			matcher(givenSystemCode, givenVersionMarker),
		);
	});
});
