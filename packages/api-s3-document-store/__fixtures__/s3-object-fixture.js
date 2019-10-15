const s3GetObjectResponseFixture = (fixtureData, versionMarker) => {
	const buffer = Buffer.from(JSON.stringify(fixtureData), 'utf8');
	return {
		AcceptRanges: 'bytes',
		LastModified: new Date('2019-10-14T12:38:03.000Z'),
		ContentLength: Buffer.byteLength(buffer),
		ETag: '',
		VersionId: versionMarker,
		ContentType: 'application/json',
		Metadata: {},
		Body: buffer,
	};
};

const s3DeleteObjectResponseFixture = versionMarker => ({
	DeleteMarker: versionMarker !== null,
	VersionId: versionMarker,
});

const s3UploadResponseFixture = (bucket, key, versionMarker) => ({
	ETag: '',
	VersionId: versionMarker,
	Location: `https://${bucket}.eu-west-1.amazonaws.com/${key}`,
	key,
	Key: key,
	Bucket: bucket,
});

const createExampleBodyData = () => ({
	firstLineTroubleshooting: 'firstLineTroubleshooting',
	moreInformation: 'moreInformation',
	monitoring: 'monitoring',
	architectureDiagram: 'architectureDiagram',
});

module.exports = {
	s3GetObjectResponseFixture,
	s3DeleteObjectResponseFixture,
	s3UploadResponseFixture,
	createExampleBodyData,
};
