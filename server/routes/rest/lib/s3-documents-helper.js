const AWS = require('aws-sdk');
const { diff } = require('deep-diff');
const _isEmpty = require('lodash.isempty');
const { logger } = require('../../../lib/request-context');
const { diffProperties } = require('../lib/diff-helpers');

const s3BucketInstance = new AWS.S3({
	accessKeyId: process.env.AWS_ACCESS_KEY,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

class S3DocumentsHelper {
	constructor(s3Bucket = s3BucketInstance) {
		const s3BucketPrefixCode = 'biz-ops-documents';
		this.s3BucketName = `${s3BucketPrefixCode}.${process.env.AWS_ACCOUNT_ID}`;
		this.s3Bucket = s3Bucket;
	}

	async uploadToS3(params, requestType) {
		try {
			const res = await this.s3Bucket.upload(params).promise();
			logger.info(
				{ event: `${requestType}_S3_SUCCESS` },
				res,
				`${requestType}: S3 Upload successful`,
			);
			return res.VersionId;
		} catch (err) {
			logger.info(
				{ event: `${requestType}_S3_FAILURE` },
				err,
				`${requestType}: S3 Upload failed`,
			);
		}
	}

	async writeFileToS3(nodeType, code, body) {
		const params = {
			Bucket: this.s3BucketName,
			Key: `${nodeType}/${code}`,
			Body: JSON.stringify(body),
		};
		const res = await this.uploadToS3(params, 'POST');
		return res;
	}

	async patchS3file(nodeType, code, body) {
		const params = {
			Bucket: this.s3BucketName,
			Key: `${nodeType}/${code}`,
		};
		try {
			const existingNode = await this.s3Bucket
				.getObject(params)
				.promise();
			const existingBody = JSON.parse(existingNode.Body);
			if (diff(existingBody, body)) {
				const newBody = Object.assign(existingBody, body);
				return this.uploadToS3(
					Object.assign({ Body: JSON.stringify(newBody) }, params),
					'PATCH',
				);
			}
		} catch (err) {
			return this.uploadToS3(
				Object.assign({ Body: JSON.stringify(body) }, params),
				'PATCH',
			);
		}
	}

	async sendDocumentsToS3(method, nodeType, code, body) {
		const send = method === 'POST' ? this.writeFileToS3 : this.patchS3file;
		const versionId = await send.call(this, nodeType, code, body);
		return versionId;
	}

	async deleteFileFromS3(nodeType, code, versionId) {
		const params = {
			Bucket: this.s3BucketName,
			Key: `${nodeType}/${code}`,
		};
		if (versionId) {
			params.VersionId = versionId;
		}
		try {
			const res = await this.s3Bucket.deleteObject(params).promise();
			logger.info(
				{ event: `DELETE_S3_SUCCESS` },
				res,
				'DELETE: S3 Delete successful',
			);
			return res.VersionId;
		} catch (err) {
			logger.info(
				{ event: `DELETE_S3_FAILURE` },
				err,
				'DELETE: S3 Delete failed',
			);
		}
	}

	async mergeFilesInS3(nodeType, sourceCode, destinationCode) {
		const sourceNodeParams = {
			Bucket: this.s3BucketName,
			Key: `${nodeType}/${sourceCode}`,
		};
		const destinationCodeParams = {
			Bucket: this.s3BucketName,
			Key: `${nodeType}/${destinationCode}`,
		};

		const [sourceNode, destinationNode] = await Promise.all([
			this.s3Bucket.getObject(sourceNodeParams).promise(),
			this.s3Bucket.getObject(destinationCodeParams).promise(),
		]);
		const sourceNodeBody = JSON.parse(sourceNode.Body);
		const destinationNodeBody = JSON.parse(destinationNode.Body);

		const writeProperties = diffProperties({
			nodeType,
			newContent: sourceNodeBody,
			initialContent: destinationNodeBody,
		});
		Object.keys(sourceNodeBody).forEach(name => {
			if (name in destinationNodeBody) {
				delete writeProperties[name];
			}
		});
		const mergeResults = [this.deleteFileFromS3(nodeType, sourceCode)];
		if (!_isEmpty(writeProperties)) {
			Object.keys(writeProperties).forEach(property => {
				destinationNodeBody[property] = writeProperties[property];
			});
			mergeResults.push(
				this.writeFileToS3(
					nodeType,
					destinationCode,
					destinationNodeBody,
				),
			);
		}
		const [deleteVersionId, writeVersionId] = await Promise.all(
			mergeResults,
		);
		return { deleteVersionId, writeVersionId };
	}
}

module.exports = S3DocumentsHelper;
