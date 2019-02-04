const AWS = require('aws-sdk');
const { Readable } = require('stream');

const s3Client = new AWS.S3({ region: 'eu-west-1' });

const sendToS3 = async (
	content,
	{ environment, majorVersion, isPrerelease },
) => {
	const uploadStream = new Readable();
	uploadStream.push(content);
	uploadStream.push(null);
	await s3Client
		.upload({
			Bucket: `biz-ops-schema`,
			Key: `${environment}/v${majorVersion}${
				isPrerelease ? '-prerelease' : ''
			}.json`,
			Body: uploadStream,
			ContentType: 'application/json',
		})
		.promise();
};

module.exports = sendToS3;
