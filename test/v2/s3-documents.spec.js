const S3DocumentsHelper = require('../../server/routes/rest/lib/s3-documents-helper');
const { schemaReady } = require('../../server/lib/init-schema');

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
			console.log('stub out s3.............');
			stubGetObject.mockReturnValueOnce({
				promise: jest
					.fn()
					// .mockRejectedValueOnce(new Error("Node doesn't exist")),
					.mockRejectedValueOnce({ code: 'NoSuchKey' }),
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
				promise: jest
					.fn()
					// .mockRejectedValueOnce(new Error("Node doesn't exist")),
					.mockRejectedValueOnce({ code: 'NoSuchKey' }),
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
		const requestNodeType = 'System';
		const requestCode = 'test-system-code';
		const requestBody = {
			troubleshooting: 'Fake Document',
			architectureDiagram: 'Another Fake Document',
		};
		return { requestNodeType, requestCode, requestBody };
	};

	beforeAll(() => schemaReady);

	it('writes a file to S3', () => {
		const { requestNodeType, requestCode, requestBody } = exampleRequest();
		const { stubUpload, mockS3Bucket } = stubOutS3(false);
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		s3DocumentsHelper.writeFileToS3(
			requestNodeType,
			requestCode,
			requestBody,
		);
		expect(stubUpload).toHaveBeenCalledTimes(1);
		expect(stubUpload).toHaveBeenLastCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
			Body: JSON.stringify(requestBody),
		});
	});

	it('deletes a file from S3', () => {
		const { requestNodeType, requestCode } = exampleRequest();
		const { stubDelete, mockS3Bucket } = stubOutS3(false);
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		s3DocumentsHelper.deleteFileFromS3(requestNodeType, requestCode);
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenLastCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
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
		await s3DocumentsHelper.patchS3file(
			requestNodeType,
			requestCode,
			requestBody,
			mockS3Bucket,
		);
		expect(stubGetObject).toHaveBeenCalledTimes(1);
		expect(stubGetObject).toHaveBeenLastCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
		});
		expect(stubUpload).not.toHaveBeenCalled();
	});

	it('patches a file from S3 when the node exists and has changed', async () => {
		const { requestNodeType, requestCode, requestBody } = exampleRequest();
		const savedBody = {
			troubleshooting: 'Fake Document',
			architectureDiagram: 'A Different Fake Document',
		};
		const { stubUpload, stubGetObject, mockS3Bucket } = stubOutS3(
			true,
			JSON.stringify(savedBody),
		);

		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);

		await s3DocumentsHelper.patchS3file(
			requestNodeType,
			requestCode,
			requestBody,
			mockS3Bucket,
		);
		const mergedBody = Object.assign(savedBody, requestBody);
		expect(stubGetObject).toHaveBeenCalledTimes(1);
		expect(stubGetObject).toHaveBeenLastCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
		});
		expect(stubUpload).toHaveBeenCalledTimes(1);
		expect(stubUpload).toHaveBeenLastCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
			Body: JSON.stringify(mergedBody),
		});
	});

	it('patch creates a file in S3 when the node does not already exist', async () => {
		const { requestNodeType, requestCode, requestBody } = exampleRequest();
		const { stubUpload, stubGetObject, mockS3Bucket } = stubOutS3(
			false,
			new Error("Node doesn't exist"),
		);
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		await s3DocumentsHelper.patchS3file(
			requestNodeType,
			requestCode,
			requestBody,
			mockS3Bucket,
		);
		expect(stubGetObject).toHaveBeenCalledTimes(1);
		expect(stubGetObject).toHaveBeenLastCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
		});
		expect(stubUpload).toHaveBeenCalledTimes(1);
		expect(stubUpload).toHaveBeenLastCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
			Body: JSON.stringify(requestBody),
		});
	});

	it('merges a file to s3', async () => {
		const { requestNodeType, requestCode } = exampleRequest();
		const sourceRequestBody = {
			troubleshooting: 'Fake Document',
			architectureDiagram: 'Another Fake Document',
		};
		const destinationRequestBody = {
			troubleshooting: 'A Third Fake Document',
		};
		const { stubUpload, stubDelete, mockS3Bucket } = stubOutS3(
			true,
			JSON.stringify(sourceRequestBody),
			true,
			JSON.stringify(destinationRequestBody),
		);
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		await s3DocumentsHelper.mergeFilesInS3(
			requestNodeType,
			requestCode,
			'test-system-code-2',
		);
		expect(stubUpload).toHaveBeenCalledTimes(1);
		expect(stubUpload).toHaveBeenLastCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/test-system-code-2`,
			Body: JSON.stringify({
				troubleshooting: 'A Third Fake Document',
				architectureDiagram: 'Another Fake Document',
			}),
		});
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
		});
	});

	it('when merging, it does not upload to s3 when the source node and the destination node have the same keys', async () => {
		const { requestNodeType, requestCode } = exampleRequest();
		const sourceRequestBody = {
			troubleshooting: 'Fake Document',
		};
		const destinationRequestBody = {
			troubleshooting: 'Another Fake Document',
		};
		const { stubUpload, stubDelete, mockS3Bucket } = stubOutS3(
			true,
			JSON.stringify(sourceRequestBody),
			true,
			JSON.stringify(destinationRequestBody),
		);
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		await s3DocumentsHelper.mergeFilesInS3(
			requestNodeType,
			requestCode,
			'test-system-code-2',
		);
		expect(stubUpload).toHaveBeenCalledTimes(0);
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
		});
	});

	it('when merging, takes no actions if neither the source node nor the destination node have document properties', async () => {
		const { requestNodeType, requestCode } = exampleRequest();
		const {
			stubUpload,
			stubDelete,
			stubGetObject,
			mockS3Bucket,
		} = stubOutS3(false, null, false, null);
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		const res = await s3DocumentsHelper.mergeFilesInS3(
			requestNodeType,
			requestCode,
			'test-system-code-2',
		);
		expect(res).toEqual({ deleteVersionId: false, writeVersionId: false });
		expect(stubGetObject).toHaveBeenCalledTimes(2);
		expect(stubGetObject).toHaveBeenCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
		});
		expect(stubGetObject).toHaveBeenCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/test-system-code-2`,
		});
		expect(stubUpload).toHaveBeenCalledTimes(0);
		expect(stubDelete).toHaveBeenCalledTimes(0);
	});

	it('when merging, takes no actions if the source node has no document properties but the destination node does', async () => {
		const { requestNodeType, requestCode } = exampleRequest();
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
				troubleshooting: 'Fake Document',
			}),
		);
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		const res = await s3DocumentsHelper.mergeFilesInS3(
			requestNodeType,
			requestCode,
			'test-system-code-2',
		);
		expect(res).toEqual({ deleteVersionId: false, writeVersionId: false });
		expect(stubGetObject).toHaveBeenCalledTimes(2);
		expect(stubGetObject).toHaveBeenCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
		});
		expect(stubGetObject).toHaveBeenCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/test-system-code-2`,
		});
		expect(stubUpload).toHaveBeenCalledTimes(0);
		expect(stubDelete).toHaveBeenCalledTimes(0);
	});

	it('when merging, deletes the source node and writes to the destination node if the destination node has no document properties but the source node does', async () => {
		const { requestNodeType, requestCode } = exampleRequest();
		const {
			stubUpload,
			stubDelete,
			stubGetObject,
			mockS3Bucket,
		} = stubOutS3(
			true,
			JSON.stringify({
				troubleshooting: 'Fake Document',
			}),
			false,
			null,
		);
		const s3DocumentsHelper = new S3DocumentsHelper(mockS3Bucket);
		const res = await s3DocumentsHelper.mergeFilesInS3(
			requestNodeType,
			requestCode,
			'test-system-code-2',
		);
		expect(res).toEqual({
			deleteVersionId: 'FakeDeleteVersionId',
			writeVersionId: 'FakeUploadVersionId',
		});
		expect(stubGetObject).toHaveBeenCalledTimes(2);
		expect(stubGetObject).toHaveBeenCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
		});
		expect(stubGetObject).toHaveBeenCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/test-system-code-2`,
		});
		expect(stubUpload).toHaveBeenCalledTimes(1);
		expect(stubUpload).toHaveBeenLastCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/test-system-code-2`,
			Body: JSON.stringify({
				troubleshooting: 'Fake Document',
			}),
		});
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete).toHaveBeenCalledWith({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
		});
	});
});
