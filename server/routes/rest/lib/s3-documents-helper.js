const AWS = require('aws-sdk');
const { diff } = require('deep-diff');

const s3DocumentsBucket = () => {
	return new AWS.S3({
		accessKeyId: process.env.AWS_ACCESS_KEY,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	});
};

const writeFileToS3 = (nodeType, code, body) => {
	const s3 = s3DocumentsBucket();
	const params = {
		Bucket: 'biz-ops-documents.510688331160',
		Key: `${nodeType}/${code}`,
		Body: JSON.stringify(body),
	};
	s3.upload(params, function(err, data) {
		console.log('post');
		console.log(err, data);
	});
};

const patchS3file = (nodeType, code, body) => {
	const s3 = s3DocumentsBucket();
	const params = {
		Bucket: 'biz-ops-documents.510688331160',
		Key: `${nodeType}/${code}`,
	};
	s3.getObject(params, function(readErr, readData) {
		console.log(readErr, readData);
		if (readErr) {
			console.log(readErr, readErr.stack);
			s3.upload(
				Object.assign({ Body: JSON.stringify(body) }, params),
				function(writeErr, writeData) {
					console.log(writeErr, writeData);
					console.log("patch, node doesn't exist");
				},
			);
		} else {
			// console.log("dataaaa ", JSON.parse(data.Body));
			if (diff(JSON.parse(readData.Body), body)) {
				s3.upload(
					Object.assign({ Body: JSON.stringify(body) }, params),
					function(writeErr, writeData) {
						console.log(writeErr, writeData);
						console.log('patch, node updated');
					},
				);
			} else {
				console.log('patch, node is unchanged');
			}
		}
	});
};

const deleteFileFromS3 = (nodeType, code) => {
	const s3 = s3DocumentsBucket();

	const params = {
		Bucket: 'biz-ops-documents.510688331160',
		Key: `${nodeType}/${code}`,
	};

	s3.deleteObject(params, function(err, data) {
		if (err) {
			console.log(err, err.stack);
		} else {
			console.log(data);
			console.log('delete');
		}
	});
};

module.exports = {
	writeFileToS3,
	patchS3file,
	deleteFileFromS3,
};
