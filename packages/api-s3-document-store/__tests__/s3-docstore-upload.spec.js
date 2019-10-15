jest.mock('aws-sdk');
const { S3 } = require('aws-sdk');

const { createS3Instance } = require('../s3');
const { upload } = require('../upload');
const {
	s3UploadResponseFixture,
	createExampleBodyData,
} = require('../__fixtures__/s3-object-fixture');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;

const mockS3Upload = (nodeType, systemCode, versionMarker) => {
	let promiseResult;

	if (systemCode === 'docstore-upload-test') {
		promiseResult = jest
			.fn()
			.mockResolvedValue(
				s3UploadResponseFixture(
					TREECREEPER_DOCSTORE_S3_BUCKET,
					`${nodeType}/${systemCode}`,
					versionMarker,
				),
			);
	} else {
		promiseResult = jest
			.fn()
			.mockRejectedValue(new Error('something went wrong'));
	}

	const stubUpload = jest.fn().mockReturnValue({ promise: promiseResult });

	S3.mockImplementation(() => ({
		upload: stubUpload,
	}));
	return {
		// We need to create S3 instance here in order to use mocked instance
		s3Instance: createS3Instance({
			accessKeyId: 'testAccessKeyId',
			secretAccessKey: 'testSecretAccessKey',
		}),
		stubUpload,
	};
};

describe('S3 document helper upload (internal function)', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	const consistentNodeType = 'System';

	test('returns uploaded new version marker', async () => {
		const givenSystemCode = 'docstore-upload-test';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const { stubUpload, s3Instance } = mockS3Upload(
			consistentNodeType,
			givenSystemCode,
			givenVersionMarker,
		);
		const expectedData = createExampleBodyData();

		const callParams = {
			Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
			Key: `${consistentNodeType}/${givenSystemCode}`,
			Body: JSON.stringify(expectedData),
		};

		const versionMarker = await upload({
			s3Instance,
			params: callParams,
			requestType: 'POST',
		});

		expect(stubUpload).toHaveBeenCalled();
		expect(stubUpload).toHaveBeenCalledWith(callParams);
		expect(versionMarker).toBe(givenVersionMarker);
	});

	test('returns false when upload fails', async () => {
		const givenSystemCode = 'docstore-upload-test-unexpected';
		const givenNodeType = 'System';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const { stubUpload, s3Instance } = mockS3Upload(
			consistentNodeType,
			givenSystemCode,
			givenVersionMarker,
		);
		const expectedData = createExampleBodyData();

		const callParams = {
			Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
			Key: `${givenNodeType}/${givenSystemCode}`,
			Body: JSON.stringify(expectedData),
		};

		const versionMarker = await upload({
			s3Instance,
			params: callParams,
			requestType: 'POST',
		});

		expect(stubUpload).toHaveBeenCalled();
		expect(stubUpload).toHaveBeenCalledWith(callParams);
		expect(versionMarker).toBe(false);
	});
});
