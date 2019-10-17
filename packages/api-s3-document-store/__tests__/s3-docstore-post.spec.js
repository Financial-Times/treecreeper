jest.mock('../upload');

const { createS3Instance } = require('../s3');
const { docstore } = require('..');
const uploadModule = require('../upload');
const { createExampleBodyData } = require('../__fixtures__/s3-object-fixture');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;

const mockS3Post = versionMarker => {
	// s3Post depends on upload module so we create stub for upload module
	const stubUpload = jest
		.spyOn(uploadModule, 'upload')
		.mockResolvedValue(versionMarker);

	return {
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

	const consistentNodeType = 'System';

	const s3Instance = createS3Instance({
		accessKeyId: 'testAccessKeyId',
		secretAccessKey: 'testSecretAccessKey',
	});

	test('returns exact uploaded body and versionMarker', async () => {
		const givenSystemCode = 'docstore-post-test';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const { stubUpload } = mockS3Post(givenVersionMarker);
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
		});
	});
});
