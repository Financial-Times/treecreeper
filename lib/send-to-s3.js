const AWS = require('aws-sdk');
const { Readable } = require('stream');
const semver = require('semver');

const s3Client = new AWS.S3({ region: 'eu-west-1' });

const sendToS3 = async (content, { environment, versionData }) => {
	const majorVersion = semver.major(versionData);
	const isPrerelease = !!semver.prerelease(versionData);
	const uploadStream = new Readable();
	uploadStream.push(content);
	uploadStream.push(null);
	await s3Client
		.upload({
			Bucket: `biz-ops-schema.${process.env.AWS_ACCOUNT_ID}`,
			Key: `${environment}/v${majorVersion}${
				isPrerelease ? '-prerelease' : ''
			}.json`,
			Body: uploadStream,
			ContentType: 'application/json',
		})
		.promise();
};

module.exports = sendToS3;
