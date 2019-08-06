const S3DocumentsHelper = require('../../server/routes/rest/lib/s3-documents-helper');

describe('S3 Documents Helper', () => {
	const stubOutS3 = (resolved, value) => {
		const stubUpload = jest.fn();
		stubUpload.mockReturnValueOnce({
			promise: jest.fn().mockResolvedValueOnce(true),
		});
		const stubDelete = jest.fn();
		stubDelete.mockReturnValueOnce({
			promise: jest.fn().mockResolvedValueOnce(true),
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
				promise: jest
					.fn()
					.mockRejectedValueOnce(new Error("Node doesn't exist")),
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
			code: requestCode,
			name: 'test-system-name',
			description: 'test-system-description',
		};
		return { requestNodeType, requestCode, requestBody };
	};

	it('writes a file to S3', () => {
		const { requestNodeType, requestCode, requestBody } = exampleRequest();
		const { stubUpload, mockS3Bucket } = stubOutS3(false, null);
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
		const { stubDelete, mockS3Bucket } = stubOutS3(false, null);
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
});
