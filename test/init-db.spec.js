const { initConstraints } = require('../server/init-db');
const { expect } = require('chai');
const sinon = require('sinon');
const { driver } = require('../server/lib/db-connection');
const schema = require('@financial-times/biz-ops-schema');

const mockConstraints = (stub, constraints, writeResponse) => {
	stub.withArgs('CALL db.constraints').returns(
		Promise.resolve({
			records: constraints.map(val => ({
				get: () => val
			}))
		})
	);

	stub.returns(
		writeResponse ||
			Promise.resolve({
				records: []
			})
	);
};

describe('creating db constraints', () => {
	let sandbox;
	let dbRun;
	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(schema, 'getTypes');
		sandbox.stub(driver, 'session').returns({
			run: (dbRun = sandbox.stub()),
			close: () => null
		});
	});

	afterEach(() => sandbox.restore());

	it("creates a uniqueness constraint if it doesn't exist", async () => {
		mockConstraints(dbRun, ['CONSTRAINT ON (s:Dog) ASSERT s.nose IS UNIQUE']);
		schema.getTypes.returns([
			{ name: 'Dog', properties: { tail: { unique: true } } }
		]);
		await initConstraints();
		expect(dbRun).calledWith(
			'CREATE CONSTRAINT ON (s:Dog) ASSERT s.tail IS UNIQUE'
		);
	});

	it("creates an existence constraint if it doesn't exist", async () => {
		mockConstraints(dbRun, ['CONSTRAINT ON (s:Dog) ASSERT exists(s.nose)']);
		schema.getTypes.returns([
			{ name: 'Dog', properties: { tail: { required: true } } }
		]);
		await initConstraints();
		expect(dbRun).calledWith(
			'CREATE CONSTRAINT ON (s:Dog) ASSERT exists(s.tail)'
		);
	});

	it("doesn't create a uniqueness constraint if it does exist", async () => {
		mockConstraints(dbRun, ['CONSTRAINT ON (s:Dog) ASSERT s.nose IS UNIQUE']);
		schema.getTypes.returns([
			{ name: 'Dog', properties: { nose: { unique: true } } }
		]);
		await initConstraints();
		expect(dbRun).not.calledWith(
			'CREATE CONSTRAINT ON (s:Dog) ASSERT s.tail IS UNIQUE'
		);
	});

	it("doesn't create an existence constraint if it does exist", async () => {
		mockConstraints(dbRun, ['CONSTRAINT ON (s:Dog) ASSERT exists(s.nose)']);
		schema.getTypes.returns([
			{ name: 'Dog', properties: { nose: { required: true } } }
		]);
		await initConstraints();
		expect(dbRun).not.calledWith(
			'CREATE CONSTRAINT ON (s:Dog) ASSERT exists(s.tail)'
		);
	});

	it('handles a mixture of creates, ignores and removes', async () => {
		mockConstraints(dbRun, [
			'CONSTRAINT ON (s:Dog) ASSERT s.nose IS UNIQUE',
			'CONSTRAINT ON (s:Dog) ASSERT exists(s.tail)',
			'CONSTRAINT ON (s:Cat) ASSERT exists(s.tail)'
		]);
		schema.getTypes.returns([
			{
				name: 'Dog',
				properties: {
					tail: { unique: true },
					nose: { unique: true, required: true }
				}
			},
			{ name: 'Cat', properties: { whiskers: { required: true } } }
		]);
		await initConstraints();

		[
			'CREATE CONSTRAINT ON (s:Dog) ASSERT s.tail IS UNIQUE',
			'CREATE CONSTRAINT ON (s:Dog) ASSERT exists(s.nose)',
			'CREATE CONSTRAINT ON (s:Cat) ASSERT exists(s.whiskers)'
		].forEach(query => expect(dbRun).calledWith(query));
	});

	it('handles failure gracefully', async () => {
		schema.getTypes.returns([]);
		mockConstraints(dbRun, [], Promise.reject('db call has failed'));
		// this should not throw
		await initConstraints();
	});
});
