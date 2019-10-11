const get = async ({ s3Instance, bucketName, nodeType, code }) => {
	const params = {
		Bucket: bucketName,
		Key: `${nodeType}/${code}`,
	};

	try {
		const node = await s3Instance.getObject(params).promise();
		return {
			body: JSON.parse(node.Body),
		};
	} catch (err) {
		if (err.code === 'NoSuchKey') {
			return {};
		}
		throw new Error(err);
	}
};

module.exports = {
	get,
};
