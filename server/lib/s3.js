const { S3 } = require('aws-sdk');

const {
	AWS_API_VERSION: apiVersion = '2006-03-01',
	AWS_REGION: region = 'gdpr-3sp-upload',
	AWS_BUCKET: Bucket = 'eu-west-1',
	AWS_EXPIRES: Expires = 60 * 60 * 24, // 24 hours
	AWS_ACCESS_KEY_ID: accessKeyId,
	AWS_SECRET_ACCESS_KEY: secretAccessKey,
} = process.env;

exports.getSignedUrl = Key => new Promise((resolve, reject) => {
	const client = new S3({ apiVersion, region, accessKeyId, secretAccessKey});
	const params = { Bucket, Key, Expires };
	client.getSignedUrl('getObject', params, (error, url) => {
		if (url) resolve(url);
		else reject(error);
	});
});
