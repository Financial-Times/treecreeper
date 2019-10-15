jest.mock('aws-sdk');
const { S3 } = require('aws-sdk');

const { createS3Instance } = require('../s3');
const { docstore } = require('..');
const {
	s3GetObjectResponseFixture,
	createExampleBodyData,
} = require('../__fixtures__/s3-object-fixture');

const { TREECREEPER_DOCSTORE_S3_BUCKET } = process.env;

const mockS3GetObject = (systemCode, fixture, versionMarker) => {
	let promiseResult;

	if (systemCode === 'docstore-get-test') {
		promiseResult = jest
			.fn()
			.mockResolvedValue(
				s3GetObjectResponseFixture(fixture, versionMarker),
			);
	} else if (systemCode === 'docstore-get-no-such-key') {
		const error = new Error('Key not found');
		error.code = 'NoSuchKey';
		promiseResult = jest.fn().mockRejectedValue(error);
	} else {
		promiseResult = jest
			.fn()
			.mockRejectedValue(new Error('something went wrong'));
	}

	const stubGetObject = jest.fn().mockReturnValue({ promise: promiseResult });

	S3.mockImplementation(() => ({
		getObject: stubGetObject,
	}));
	return {
		// We need to create S3 instance here in order to use mocked instance
		s3Instance: createS3Instance({
			accessKeyId: 'testAccessKeyId',
			secretAccessKey: 'testSecretAccessKey',
		}),
		stubGetObject,
	};
};

describe('S3 document helper get', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});

	const consistentNodeType = 'System';

	const matcher = systemCode => ({
		Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
		Key: `${consistentNodeType}/${systemCode}`,
	});

	test('returns exact object', async () => {
		const givenSystemCode = 'docstore-get-test';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
		const expectedData = createExampleBodyData();

		const { stubGetObject, s3Instance } = mockS3GetObject(
			givenSystemCode,
			expectedData,
			givenVersionMarker,
		);
		const store = docstore(s3Instance);

		const result = await store.get(consistentNodeType, givenSystemCode);

		expect(result).toMatchObject({
			body: expectedData,
		});
		expect(stubGetObject).toHaveBeenCalledTimes(1);
		expect(stubGetObject).toHaveBeenCalledWith(matcher(givenSystemCode));
	});

	test('returns empty object when S3 responds with NoSuchKey error', async () => {
		const givenSystemCode = 'docstore-get-no-such-key';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
		const expectedData = createExampleBodyData();

		const { stubGetObject, s3Instance } = mockS3GetObject(
			givenSystemCode,
			expectedData,
			givenVersionMarker,
		);
		const store = docstore(s3Instance);
		const result = await store.get(consistentNodeType, givenSystemCode);

		expect(Object.keys(result)).toHaveLength(0);
		expect(stubGetObject).toHaveBeenCalledTimes(1);
		expect(stubGetObject).toHaveBeenCalledWith(matcher(givenSystemCode));
	});

	test('throws error when S3 responds with unexpected error ', async () => {
		const givenSystemCode = 'docstore-get-unexpected';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';
		const expectedData = createExampleBodyData();

		const { stubGetObject, s3Instance } = mockS3GetObject(
			givenSystemCode,
			expectedData,
			givenVersionMarker,
		);
		const store = docstore(s3Instance);

		await expect(
			store.get(consistentNodeType, givenSystemCode),
		).rejects.toThrow(Error);

		expect(stubGetObject).toHaveBeenCalledTimes(1);
		expect(stubGetObject).toHaveBeenCalledWith(matcher(givenSystemCode));
	});
});
