jest.mock('../upload');
jest.mock('../get');

const { createS3Instance } = require('../s3');
const { docstore } = require('..');
const uploadModule = require('../upload');
const getModule = require('../get');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;

const baseBodyData = {
	firstLineTroubleshooting: 'firstLineTroubleshooting',
	moreInformation: 'moreInformation',
	monitoring: 'monitoring',
	architectureDiagram: 'architectureDiagram',
};

const mockS3Patch = versionMarker => {
	// s3Patch depends on s3Get and upload module so we create stub for them
	const stubUpload = jest
		.spyOn(uploadModule, 'upload')
		.mockResolvedValue(versionMarker);

	const stubGetObject = jest.spyOn(getModule, 's3Get').mockResolvedValue({
		body: baseBodyData,
	});

	return {
		s3Instance: createS3Instance({
			accessKeyId: 'testAccessKeyId',
			secretAccessKey: 'testSecretAccessKey',
		}),
		stubUpload,
		stubGetObject,
	};
};

describe('S3 document helper patch', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('returns existing body object when patch object is completely same', async () => {
		const givenSystemCode = 'docstore-patch-test';
		const givenNodeType = 'System';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const { stubUpload, stubGetObject, s3Instance } = mockS3Patch(
			givenVersionMarker,
		);
		const store = docstore(s3Instance);

		const result = await store.patch(
			givenNodeType,
			givenSystemCode,
			baseBodyData,
		);

		expect(stubUpload).not.toHaveBeenCalled();
		expect(stubGetObject).toHaveBeenCalled();
		expect(stubGetObject).toHaveBeenCalledWith({
			s3Instance,
			bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
			nodeType: givenNodeType,
			code: givenSystemCode,
		});
		expect(result).toMatchObject({
			body: baseBodyData,
		});
		expect(result).not.toHaveProperty('versionMarker');
	});
	test('returns patched body with new versionMakrer', async () => {
		const givenSystemCode = 'docstore-patch-test';
		const givenNodeType = 'System';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const { stubUpload, stubGetObject, s3Instance } = mockS3Patch(
			givenVersionMarker,
		);
		const store = docstore(s3Instance);

		const patchBody = {
			extraField: 'will be patched',
		};
		const result = await store.patch(
			givenNodeType,
			givenSystemCode,
			patchBody,
		);

		const expectedBody = Object.assign({}, baseBodyData, patchBody);

		expect(stubUpload).toHaveBeenCalled();
		expect(stubUpload).toHaveBeenCalledWith({
			s3Instance,
			params: {
				Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
				Key: `${givenNodeType}/${givenSystemCode}`,
				Body: JSON.stringify(expectedBody),
			},
			requestType: 'PATCH',
		});
		expect(stubGetObject).toHaveBeenCalled();
		expect(stubGetObject).toHaveBeenCalledWith({
			s3Instance,
			bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
			nodeType: givenNodeType,
			code: givenSystemCode,
		});
		expect(result).toMatchObject({
			versionMarker: givenVersionMarker,
			body: expectedBody,
		});
	});
});
