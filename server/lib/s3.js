const { S3 } = require('aws-sdk');
const { join } = require('path');

const {
	S3_AWS_REGION: region = 'eu-west-1',
	S3_AWS_BUCKET: Bucket = 'gdpr-3sp-upload',
	S3_AWS_EXPIRES: Expires = 60 * 60 * 24, // 24 hours
	S3_AWS_ACCESS_KEY_ID: accessKeyId,
	S3_AWS_SECRET_ACCESS_KEY: secretAccessKey,
	NODE_ENV: env = 'development'
} = process.env;


const getSignedUrlMock = (action, { Bucket, Key }, callback) => {
	callback(null, join('/uploads', Bucket, Key));
};

const s3Client = () => {
	if(env === 'development') return { getSignedUrl: getSignedUrlMock };
	else return new S3({apiVersion: '2006-03-01', region, accessKeyId, secretAccessKey});
};

exports.getSignedUrl = Key => new Promise((resolve, reject) => {
	s3Client().getSignedUrl('getObject', { Bucket, Key, Expires }, (error, url) => {
		if (url) resolve(url);
		else reject(error);
	});
});
