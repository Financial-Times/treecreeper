const proxyquire = require('proxyquire');
const { stub } = require('sinon');
const { expect } = require('chai');

describe('S3 methods', () => {
	let s3;
	const getSignedUrl = stub();
	const S3 = stub().returns({ getSignedUrl });
	const sdk = { S3 } ;

	beforeEach('mock stuff', () => {
		s3 = proxyquire('../server/lib/s3', { 'aws-sdk': sdk });
	});

	afterEach('reset stuff', () => {
		getSignedUrl.reset();
		S3.resetHistory();
	});

	describe('getSignedUrl', () => {
		it('creates an s3 client, queries and returns the url for the given key', async () => {
			getSignedUrl.callsArgWith(2, null, 'a-url');
			const result = await s3.getSignedUrl('kingdom');
			expect(S3).to.have.been.calledOnce;
			expect(getSignedUrl).to.have.been.calledOnce;
			expect(result).to.be.string('a-url');
		});
	});
});
