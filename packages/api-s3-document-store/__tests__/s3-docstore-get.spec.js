jest.mock('aws-sdk');
const { S3 } = require('aws-sdk');

const { createS3Instance } = require('../s3');
const { docstore } = require('..');
const {
	s3GetObjectResponseFixture,
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

	const expectedData = {
		firstLineTroubleshooting: 'firstLineTroubleshooting',
		moreInformation: 'moreInformation',
		monitoring: 'monitoring',
		architectureDiagram: 'architectureDiagram',
	};

	test('returns exact object', async () => {
		const givenSystemCode = 'docstore-get-test';
		const givenNodeType = 'System';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const { stubGetObject, s3Instance } = mockS3GetObject(
			givenSystemCode,
			expectedData,
			givenVersionMarker,
		);
		const store = docstore(s3Instance);

		const result = await store.get(givenNodeType, givenSystemCode);

		expect(stubGetObject).toHaveBeenCalledTimes(1);
		expect(stubGetObject).toHaveBeenCalledWith({
			Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
			Key: `${givenNodeType}/${givenSystemCode}`,
		});
		expect(result).toMatchObject({
			body: expectedData,
		});
	});
	test('returns empty object when S3 responds with NoSuchKey error', async () => {
		const givenSystemCode = 'docstore-get-no-such-key';
		const givenNodeType = 'System';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const { stubGetObject, s3Instance } = mockS3GetObject(
			givenSystemCode,
			expectedData,
			givenVersionMarker,
		);
		const store = docstore(s3Instance);
		const result = await store.get(givenNodeType, givenSystemCode);

		expect(stubGetObject).toHaveBeenCalledTimes(1);
		expect(stubGetObject).toHaveBeenCalledWith({
			Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
			Key: `${givenNodeType}/${givenSystemCode}`,
		});
		expect(Object.keys(result)).toHaveLength(0);
	});
	test('throws error when S3 responds with unexpected error ', async () => {
		const givenSystemCode = 'docstore-get-unexpected';
		const givenNodeType = 'System';
		const givenVersionMarker = 'Mw4owdmcWOlJIW.YZQRRsdksCXwPcTar';

		const { stubGetObject, s3Instance } = mockS3GetObject(
			givenSystemCode,
			expectedData,
			givenVersionMarker,
		);
		const store = docstore(s3Instance);

		await expect(store.get(givenNodeType, givenSystemCode)).rejects.toThrow(
			Error,
		);
		expect(stubGetObject).toHaveBeenCalledTimes(1);
		expect(stubGetObject).toHaveBeenCalledWith({
			Bucket: TREECREEPER_DOCSTORE_S3_BUCKET,
			Key: `${givenNodeType}/${givenSystemCode}`,
		});
	});
});

/*
const S3DocumentsHelper = require('..');


describe('S3 Documents Helper', () => {
	const stubOutS3 = (resolved, value, secondResolved, secondValue) => {
		const stubUpload = jest.fn();
		stubUpload.mockReturnValueOnce({
			promise: jest
				.fn()
				.mockResolvedValueOnce({ VersionId: 'FakeUploadVersionId' }),
		});
		const stubDelete = jest.fn();
		stubDelete.mockReturnValueOnce({
			promise: jest
				.fn()
				.mockResolvedValueOnce({ VersionId: 'FakeDeleteVersionId' }),
		});
		const stubGetObject = jest.fn();
		if (resolved) {
			stubGetObject.mockReturnValueOnce({
				promise: jest.fn().mockResolvedValueOnce({
					Body: value,
				}),
			});
		} else {
			stubGetObject.mockReturnValueOnce({
				promise: jest.fn().mockRejectedValueOnce({ code: 'NoSuchKey' }),
			});
		}
		if (secondResolved) {
			stubGetObject.mockReturnValueOnce({
				promise: jest.fn().mockResolvedValueOnce({
					Body: secondValue,
				}),
			});
		} else {
			stubGetObject.mockReturnValueOnce({
				promise: jest.fn().mockRejectedValueOnce({ code: 'NoSuchKey' }),
			});
		}

		const mockS3Bucket = {
			upload: stubUpload,
			deleteObject: stubDelete,
			getObject: stubGetObject,
		};
		return {
			stubUpload,
			stubDelete,
			stubGetObject,
			mockS3Bucket,
		};
	};

	const exampleRequest = () => {
		const requestNodeType = 'MainType';
		const requestCode = 'test-main-code';
		const requestBody = {
			someDocument: 'Fake Document',
			anotherDocument: 'Another Fake Document',
		};
		const bucket = 'biz-ops-documents.510688331160';
		return { requestNodeType, requestCode, requestBody, bucket };
	};

	beforeAll(() => schema.ready());

	it('writes a file to S3', () => {
		const {
			requestNodeType,
			requestCode,
			requestBody,
			bucket,
		} = exampleRequest();
		const { stubUpload, mockS3Bucket } = stubOutS3(false); // get stub value is irrelevant for this test
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		s3DocumentsHelper.post(requestNodeType, requestCode, requestBody);
		expect(stubUpload).toHaveBeenCalledTimes(1);
		expect(stubUpload).toHaveBeenLastCalledWith({
			Bucket: bucket,
			Key: `${requestNodeType}/${requestCode}`,
			Body: JSON.stringify(requestBody),
		});
	});

	it('deletes a file from S3', () => {
		const { requestNodeType, requestCode, bucket } = exampleRequest();
		const { stubDelete, mockS3Bucket } = stubOutS3(false); // get stub value is irrelevant for this test
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		s3DocumentsHelper.delete(requestNodeType, requestCode);
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenLastCalledWith({
			Bucket: bucket,
			Key: `${requestNodeType}/${requestCode}`,
		});
	});

	it('gets a file from S3', () => {
		const { requestNodeType, requestCode, bucket } = exampleRequest();
		const { stubGetObject, mockS3Bucket } = stubOutS3(false); // get stub value is irrelevant for this test
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		s3DocumentsHelper.get(requestNodeType, requestCode);
		expect(stubGetObject).toHaveBeenCalledTimes(1);
		expect(stubGetObject).toHaveBeenLastCalledWith({
			Bucket: bucket,
			Key: `${requestNodeType}/${requestCode}`,
		});
	});

	it('does not patch a file in S3 when the node exists but is unchanged', async () => {
		const { requestNodeType, requestCode, requestBody } = exampleRequest();
		const savedBody = requestBody; // requestBody is the same as savedBody existsing in S3
		const { stubUpload, stubGetObject, mockS3Bucket } = stubOutS3(
			true,
			JSON.stringify(savedBody),
		);
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		await s3DocumentsHelper.patch(
			requestNodeType,
			requestCode,
			requestBody,
		);
		expect(stubGetObject).toHaveBeenCalledTimes(1);
		expect(stubGetObject).toHaveBeenLastCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
		});
		expect(stubUpload).not.toHaveBeenCalled();
	});

	it('patches a file from S3 when the node exists and has changed', async () => {
		const {
			requestNodeType,
			requestCode,
			requestBody,
			bucket,
		} = exampleRequest();
		const savedBody = {
			someDocument: 'Fake Document',
			anotherDocument: 'A Different Fake Document',
		};
		const { stubUpload, stubGetObject, mockS3Bucket } = stubOutS3(
			true,
			JSON.stringify(savedBody),
		);
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);

		await s3DocumentsHelper.patch(
			requestNodeType,
			requestCode,
			requestBody,
		);
		const mergedBody = Object.assign(savedBody, requestBody);
		expect(stubGetObject).toHaveBeenCalledTimes(1);
		expect(stubGetObject).toHaveBeenLastCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
		});
		expect(stubUpload).toHaveBeenCalledTimes(1);
		expect(stubUpload).toHaveBeenLastCalledWith({
			Bucket: bucket,
			Key: `${requestNodeType}/${requestCode}`,
			Body: JSON.stringify(mergedBody),
		});
	});

	it('patch creates a file in S3 when the node does not already exist', async () => {
		const {
			requestNodeType,
			requestCode,
			requestBody,
			bucket,
		} = exampleRequest();
		const { stubUpload, stubGetObject, mockS3Bucket } = stubOutS3(
			true,
			'{}',
		);
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		await s3DocumentsHelper.patch(
			requestNodeType,
			requestCode,
			requestBody,
		);
		expect(stubGetObject).toHaveBeenCalledTimes(1);
		expect(stubGetObject).toHaveBeenLastCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
		});
		expect(stubUpload).toHaveBeenCalledTimes(1);
		expect(stubUpload).toHaveBeenLastCalledWith({
			Bucket: bucket,
			Key: `${requestNodeType}/${requestCode}`,
			Body: JSON.stringify(requestBody),
		});
	});

	it('merges a file to s3', async () => {
		const { requestNodeType, requestCode, bucket } = exampleRequest();
		const sourceRequestBody = {
			someDocument: 'Fake Document',
			anotherDocument: 'Another Fake Document',
		};
		const destinationRequestBody = {
			someDocument: 'A Third Fake Document',
		};
		const { stubUpload, stubDelete, mockS3Bucket } = stubOutS3(
			true,
			JSON.stringify(sourceRequestBody),
			true,
			JSON.stringify(destinationRequestBody),
		);
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		await s3DocumentsHelper.merge(
			requestNodeType,
			requestCode,
			'test-main-code-2',
		);
		expect(stubUpload).toHaveBeenCalledTimes(1);
		expect(stubUpload).toHaveBeenLastCalledWith({
			Bucket: bucket,
			Key: `${requestNodeType}/test-main-code-2`,
			Body: JSON.stringify({
				someDocument: 'A Third Fake Document',
				anotherDocument: 'Another Fake Document',
			}),
		});
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith({
			Bucket: bucket,
			Key: `${requestNodeType}/${requestCode}`,
		});
	});

	it('when merging, it does not upload to s3 when the source node and the destination node have the same keys', async () => {
		const { requestNodeType, requestCode, bucket } = exampleRequest();
		const sourceRequestBody = {
			someDocument: 'Fake Document',
		};
		const destinationRequestBody = {
			someDocument: 'Another Fake Document',
		};
		const { stubUpload, stubDelete, mockS3Bucket } = stubOutS3(
			true,
			JSON.stringify(sourceRequestBody),
			true,
			JSON.stringify(destinationRequestBody),
		);
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		await s3DocumentsHelper.merge(
			requestNodeType,
			requestCode,
			'test-main-code-2',
		);
		expect(stubUpload).toHaveBeenCalledTimes(0);
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith({
			Bucket: bucket,
			Key: `${requestNodeType}/${requestCode}`,
		});
	});

	it('when merging, takes no actions if neither the source node nor the destination node have document properties', async () => {
		const { requestNodeType, requestCode, bucket } = exampleRequest();
		const {
			stubUpload,
			stubDelete,
			stubGetObject,
			mockS3Bucket,
		} = stubOutS3(false, null, false, null);
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		const res = await s3DocumentsHelper.merge(
			requestNodeType,
			requestCode,
			'test-main-code-2',
		);
		expect(res).toEqual({});
		expect(stubGetObject).toHaveBeenCalledTimes(2);
		expect(stubGetObject).toHaveBeenCalledWith({
			Bucket: bucket,
			Key: `${requestNodeType}/${requestCode}`,
		});
		expect(stubGetObject).toHaveBeenCalledWith({
			Bucket: bucket,
			Key: `${requestNodeType}/test-main-code-2`,
		});
		expect(stubUpload).toHaveBeenCalledTimes(0);
		expect(stubDelete).toHaveBeenCalledTimes(0);
	});

	it('when merging, takes no actions if the source node has no document properties but the destination node does', async () => {
		const { requestNodeType, requestCode, bucket } = exampleRequest();
		const {
			stubUpload,
			stubDelete,
			stubGetObject,
			mockS3Bucket,
		} = stubOutS3(
			false,
			null,
			true,
			JSON.stringify({
				someDocument: 'Fake Document',
			}),
		);
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		const res = await s3DocumentsHelper.merge(
			requestNodeType,
			requestCode,
			'test-main-code-2',
		);
		expect(res).toEqual({});
		expect(stubGetObject).toHaveBeenCalledTimes(2);
		expect(stubGetObject).toHaveBeenCalledWith({
			Bucket: bucket,
			Key: `${requestNodeType}/${requestCode}`,
		});
		expect(stubGetObject).toHaveBeenCalledWith({
			Bucket: bucket,
			Key: `${requestNodeType}/test-main-code-2`,
		});
		expect(stubUpload).toHaveBeenCalledTimes(0);
		expect(stubDelete).toHaveBeenCalledTimes(0);
	});

	it('when merging, deletes the source node and writes to the destination node if the destination node has no document properties but the source node does', async () => {
		const { requestNodeType, requestCode, bucket } = exampleRequest();
		const {
			stubUpload,
			stubDelete,
			stubGetObject,
			mockS3Bucket,
		} = stubOutS3(
			true,
			JSON.stringify({
				someDocument: 'Fake Document',
			}),
			false,
			null,
		);
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		const res = await s3DocumentsHelper.merge(
			requestNodeType,
			requestCode,
			'test-main-code-2',
		);
		expect(res).toEqual({
			deleteVersionId: 'FakeDeleteVersionId',
			writeVersionId: 'FakeUploadVersionId',
			updatedBody: { someDocument: 'Fake Document' },
		});
		expect(stubGetObject).toHaveBeenCalledTimes(2);
		expect(stubGetObject).toHaveBeenCalledWith({
			Bucket: bucket,
			Key: `${requestNodeType}/${requestCode}`,
		});
		expect(stubGetObject).toHaveBeenCalledWith({
			Bucket: bucket,
			Key: `${requestNodeType}/test-main-code-2`,
		});
		expect(stubUpload).toHaveBeenCalledTimes(1);
		expect(stubUpload).toHaveBeenLastCalledWith({
			Bucket: bucket,
			Key: `${requestNodeType}/test-main-code-2`,
			Body: JSON.stringify({
				someDocument: 'Fake Document',
			}),
		});
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith({
			Bucket: bucket,
			Key: `${requestNodeType}/${requestCode}`,
		});
	});
});
*/
