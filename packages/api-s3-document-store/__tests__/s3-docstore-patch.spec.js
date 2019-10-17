jest.mock('../upload');
jest.mock('../get');

const { createS3Instance } = require('../s3');
const { docstore } = require('..');
const uploadModule = require('../upload');
const getModule = require('../get');
const { createExampleBodyData } = require('../__fixtures__/s3-object-fixture');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;

const createStub = (module, method, resolvedValue) =>
	jest.spyOn(module, method).mockResolvedValue(resolvedValue);

const mockS3Patch = versionMarker => {
	// s3Patch depends on s3Get and upload module so we create stub for them
	const stubUpload = createStub(uploadModule, 'upload', versionMarker);
	const stubGetObject = createStub(getModule, 's3Get', {
		body: createExampleBodyData(),
	});

	return {
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

	const consistentNodeType = 'System';

	const s3Instance = createS3Instance({
		accessKeyId: 'testAccessKeyId',
		secretAccessKey: 'testSecretAccessKey',
	});

	const matcher = systemCode => ({
		s3Instance,
		bucketName: TREECREEPER_DOCSTORE_S3_BUCKET,
		nodeType: consistentNodeType,
		code: systemCode,
	});

	test('returns existing body object when patch object is completely same', async () => {
		const givenSystemCode = 'docstore-patch-test';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const { stubUpload, stubGetObject } = mockS3Patch(givenVersionMarker);
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
		expect(result).not.toHaveProperty('versionMarker');
		expect(stubUpload).not.toHaveBeenCalled();
		expect(stubGetObject).toHaveBeenCalled();
		expect(stubGetObject).toHaveBeenCalledWith(matcher(givenSystemCode));
	});

	test('returns patched body with new versionMakrer', async () => {
		const givenSystemCode = 'docstore-patch-test';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const { stubUpload, stubGetObject } = mockS3Patch(givenVersionMarker);
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
		});
		expect(stubUpload).toHaveBeenCalled();
		expect(stubUpload).toHaveBeenCalledWith({
			s3Instance,
			params: callParams,
			requestType: 'PATCH',
		});
		expect(stubGetObject).toHaveBeenCalled();
		expect(stubGetObject).toHaveBeenCalledWith(matcher(givenSystemCode));
	});
});
