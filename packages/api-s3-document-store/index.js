const AWS = require('aws-sdk');
const { diff } = require('deep-diff');
const _isEmpty = require('lodash.isempty');
const { logger } = require('../api-core/lib/request-context');
const { diffProperties } = require('./diff');

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

	async _uploadToS3(params, requestType) {
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
			return false;
		}
	}

	async post(nodeType, code, body) {
		const params = {
			Bucket: this.s3BucketName,
			Key: `${nodeType}/${code}`,
			Body: JSON.stringify(body),
		};
		const versionId = await this._uploadToS3(params, 'POST');
		return { versionId, newBodyDocs: body };
	}

	async patch(nodeType, code, body) {
		const params = {
			Bucket: this.s3BucketName,
			Key: `${nodeType}/${code}`,
		};
		const existingBody = await this.get(nodeType, code);
		if (diff(existingBody, body)) {
			const newBodyDocs = Object.assign(existingBody, body);
			const versionId = await this._uploadToS3(
				Object.assign({ Body: JSON.stringify(newBodyDocs) }, params),
				'PATCH',
			);
			return { versionId, newBodyDocs };
		}
		return { newBodyDocs: existingBody };
	}

	async delete(nodeType, code, versionId) {
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
			return false;
		}
	}

	async get(nodeType, code) {
		const params = {
			Bucket: this.s3BucketName,
			Key: `${nodeType}/${code}`,
		};
		let node;
		try {
			node = await this.s3Bucket.getObject(params).promise();
		} catch (err) {
			// If the node does not exist, we don't want to throw
			// an error, instead return an empty body
			if (err.code === 'NoSuchKey') return {};
			throw new Error(err);
		}
		const nodeBody = JSON.parse(node.Body);
		return nodeBody;
	}

	async merge(nodeType, sourceCode, destinationCode) {
		const [sourceNodeBody, destinationNodeBody] = await Promise.all([
			this.get(nodeType, sourceCode),
			this.get(nodeType, destinationCode),
		]);
		// If the source node has no document properties/does not exist
		// in s3, take no action and return false in place of version ids
		if (_isEmpty(sourceNodeBody)) {
			return {};
		}
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
		const mergeResults = [this.delete(nodeType, sourceCode)];
		let noPropertiesToWrite;
		if (!_isEmpty(writeProperties)) {
			Object.assign(destinationNodeBody, writeProperties);
			mergeResults.push(
				this.post(nodeType, destinationCode, destinationNodeBody),
			);
		} else {
			// If there are no properties to write to s3, no need to write
			// and return false in place of write version Id
			noPropertiesToWrite = true;
		}
		const [deleteVersionId, writeObject] = await Promise.all(mergeResults);
		const writeVersionId = writeObject && writeObject.versionId;
		if (!deleteVersionId && !writeVersionId) {
			throw new Error('MERGE FAILED: Write and delete failed in S3');
		}
		if (!deleteVersionId) {
			this.delete(nodeType, destinationCode, writeVersionId);
			throw new Error('MERGE FAILED: Delete failed in S3');
		}
		if (!writeVersionId && !noPropertiesToWrite) {
			this.delete(nodeType, sourceCode, deleteVersionId);
			throw new Error('MERGE FAILED: Write failed in S3');
		}
		return {
			deleteVersionId,
			writeVersionId,
			updatedBody: destinationNodeBody,
		};
	}
}

module.exports = S3DocumentsHelper;
