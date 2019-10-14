jest.mock('../upload');

const { createS3Instance } = require('../s3');
const { docstore } = require('..');
const uploadModule = require('../upload');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;

const mockS3Post = versionMarker => {
	// s3Post depends on upload module so we create stub for upload module
	const stubUpload = jest
		.spyOn(uploadModule, 'upload')
		.mockResolvedValue(versionMarker);

	return {
		s3Instance: createS3Instance({
			accessKeyId: 'testAccessKeyId',
			secretAccessKey: 'testSecretAccessKey',
		}),
		stubUpload,
	};
};

describe('S3 document helper post', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	const expectedData = {
		firstLineTroubleshooting: 'firstLineTroubleshooting',
		moreInformation: 'moreInformation',
		monitoring: 'monitoring',
		architectureDiagram: 'architectureDiagram',
	};

	test('returns exact uploaded body and versionMarker', async () => {
		const givenSystemCode = 'docstore-post-test';
		const givenNodeType = 'System';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const { stubUpload, s3Instance } = mockS3Post(givenVersionMarker);
		const store = docstore(s3Instance);

		const result = await store.post(
			givenNodeType,
			givenSystemCode,
			expectedData,
		);

		expect(stubUpload).toHaveBeenCalledTimes(1);
		expect(stubUpload).toHaveBeenCalledWith({
			s3Instance,
			params: {
				Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
				Key: `${givenNodeType}/${givenSystemCode}`,
				Body: JSON.stringify(expectedData),
			},
			requestType: 'POST',
		});
		expect(result).toMatchObject({
			versionMarker: givenVersionMarker,
			body: expectedData,
		});
	});
});
