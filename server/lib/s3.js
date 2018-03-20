const { S3 } = require('aws-sdk');
const { join } = require('path');

const {
	AWS_API_VERSION: apiVersion = '2006-03-01',
	AWS_REGION: region = 'eu-west-1',
	AWS_BUCKET: Bucket = 'gdpr-3sp-upload',
	AWS_EXPIRES: Expires = 60 * 60 * 24, // 24 hours
	AWS_ACCESS_KEY_ID: accessKeyId,
	AWS_SECRET_ACCESS_KEY: secretAccessKey,
	NODE_ENV: env = 'development'
} = process.env;


const getSignedUrlMock = (action, { Bucket, Key }, callback) => {
	callback(null, join('/uploads', Bucket, Key));
};

const s3Client = () => {
	if(env === 'development') return { getSignedUrl: getSignedUrlMock };
	else return new S3({apiVersion, region, accessKeyId, secretAccessKey});
};

exports.getSignedUrl = Key => new Promise((resolve, reject) => {
	s3Client().getSignedUrl('getObject', { Bucket, Key, Expires }, (error, url) => {
		if (url) resolve(url);
		else reject(error);
	});
});
