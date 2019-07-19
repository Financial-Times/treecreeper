const {
	writeFileToS3,
	patchS3file,
	deleteFileFromS3,
} = require('../../server/routes/rest/lib/s3-documents-helper');

describe('S3 Documents Helper', () => {
	const stubOutS3 = (resolved, value) => {
		const stubUpload = jest.fn();
		const stubDelete = jest.fn();
		const stubGetObject = jest.fn();
		if (resolved) {
			stubGetObject.mockReturnValueOnce({
				promise: jest.fn().mockResolvedValueOnce({
					Body: value,
				}),
			});
		} else {
			stubGetObject.mockReturnValueOnce({
				promise: jest
					.fn()
					.mockRejectedValueOnce(new Error("node doesn't exist")),
			});
		}
		const mockS3Bucket = () => ({
			upload: stubUpload,
			deleteObject: stubDelete,
			getObject: stubGetObject,
		});
		return { stubUpload, stubDelete, stubGetObject, mockS3Bucket };
	};

	const exampleRequest = () => {
		const requestNodeType = 'System';
		const requestCode = 'test-system-code';
		const requestBody = {
			code: requestCode,
			name: 'test-system-name',
			description: 'test-system-description',
		};
		return { requestNodeType, requestCode, requestBody };
	};

	it('writes a file to S3', () => {
		const { requestNodeType, requestCode, requestBody } = exampleRequest();
		const { stubUpload, mockS3Bucket } = stubOutS3(false, null);
		writeFileToS3(requestNodeType, requestCode, requestBody, mockS3Bucket);
		expect(stubUpload).toHaveBeenCalledTimes(1);
		expect(stubUpload.mock.calls[0][0]).toEqual({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
			Body: JSON.stringify(requestBody),
		});
	});

	it('deletes a file from S3', () => {
		const { requestNodeType, requestCode } = exampleRequest();
		const { stubDelete, mockS3Bucket } = stubOutS3(false, null);
		deleteFileFromS3(requestNodeType, requestCode, mockS3Bucket);
		expect(stubDelete).toHaveBeenCalledTimes(1);
		expect(stubDelete.mock.calls[0][0]).toEqual({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
		});
	});

	it('patches a file from S3 when the node exists and is unchanged (do not call upload)', async () => {
		const { requestNodeType, requestCode, requestBody } = exampleRequest();
		const savedBody = requestBody; // requestBody is the same as savedBody existsing in S3
		const { stubUpload, stubGetObject, mockS3Bucket } = stubOutS3(
			true,
			JSON.stringify(savedBody),
		);
		await patchS3file(
			requestNodeType,
			requestCode,
			requestBody,
			mockS3Bucket,
		);
		expect(stubGetObject).toHaveBeenCalledTimes(1);
		expect(stubGetObject.mock.calls[0][0]).toEqual({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
		});
		expect(stubUpload).not.toHaveBeenCalled();
	});

	it('patches a file from S3 when the node exists and has changed', async () => {
		const { requestNodeType, requestCode, requestBody } = exampleRequest();
		// savedCode is the same as requestCode but savedBody and requestBody are different
		const savedCode = requestCode;
		const savedBody = {
			code: savedCode,
			name: 'test-system-name',
			description: 'test-system-description-different',
		};
		const { stubUpload, stubGetObject, mockS3Bucket } = stubOutS3(
			true,
			JSON.stringify(savedBody),
		);
		await patchS3file(
			requestNodeType,
			requestCode,
			requestBody,
			mockS3Bucket,
		);
		const mergedBody = Object.assign(savedBody, requestBody);
		expect(stubGetObject).toHaveBeenCalledTimes(1);
		expect(stubGetObject.mock.calls[0][0]).toEqual({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
		});
		expect(stubUpload).toHaveBeenCalledTimes(1);
		expect(stubUpload.mock.calls[0][0]).toEqual({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
			Body: JSON.stringify(mergedBody),
		});
	});

	it('patches a file from S3 when the node does not exist', async () => {
		const { requestNodeType, requestCode, requestBody } = exampleRequest();
		const { stubUpload, stubGetObject, mockS3Bucket } = stubOutS3(
			false,
			new Error("node doesn't exist"),
		);
		await patchS3file(
			requestNodeType,
			requestCode,
			requestBody,
			mockS3Bucket,
		);
		expect(stubGetObject).toHaveBeenCalledTimes(1);
		expect(stubGetObject.mock.calls[0][0]).toEqual({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
		});
		expect(stubUpload).toHaveBeenCalledTimes(1);
		expect(stubUpload.mock.calls[0][0]).toEqual({
			Bucket: 'biz-ops-documents.510688331160',
			Key: `${requestNodeType}/${requestCode}`,
			Body: JSON.stringify(requestBody),
		});
	});
});
