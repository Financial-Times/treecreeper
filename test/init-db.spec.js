const { initConstraints } = require('../server/init-db');
const { driver } = require('../server/data/db-connection');
const schema = require('@financial-times/biz-ops-schema');

const mockConstraints = (stub, constraints, writeResponse) => {
	stub.mockImplementation(query => {
		if (query === 'CALL db.constraints') {
			return Promise.resolve({
				records: constraints.map(val => ({
					get: () => val
				}))
			});
		} else {
			return (
				writeResponse ||
				Promise.resolve({
					records: []
				})
			);
		}
	});
};

describe('creating db constraints', () => {
	let dbRun;
	beforeEach(() => {
		jest.spyOn(schema, 'getTypes');
		jest.spyOn(driver, 'session').mockReturnValue({
			run: (dbRun = jest.fn()),
			close: () => null
		});
	});

	afterEach(() => jest.restoreAllMocks());

	it("creates a uniqueness constraint if it doesn't exist", async () => {
		mockConstraints(dbRun, ['CONSTRAINT ON (s:Dog) ASSERT s.nose IS UNIQUE']);
		schema.getTypes.mockReturnValue([
			{ name: 'Dog', properties: { tail: { unique: true } } }
		]);
		await initConstraints();
		expect(dbRun).toHaveBeenCalledWith(
			'CREATE CONSTRAINT ON (s:Dog) ASSERT s.tail IS UNIQUE'
		);
	});

	it("creates an existence constraint if it doesn't exist", async () => {
		mockConstraints(dbRun, ['CONSTRAINT ON (s:Dog) ASSERT exists(s.nose)']);
		schema.getTypes.mockReturnValue([
			{ name: 'Dog', properties: { tail: { required: true } } }
		]);
		await initConstraints();
		expect(dbRun).toHaveBeenCalledWith(
			'CREATE CONSTRAINT ON (s:Dog) ASSERT exists(s.tail)'
		);
	});

	it("doesn't create a uniqueness constraint if it does exist", async () => {
		mockConstraints(dbRun, ['CONSTRAINT ON (s:Dog) ASSERT s.nose IS UNIQUE']);
		schema.getTypes.mockReturnValue([
			{ name: 'Dog', properties: { nose: { unique: true } } }
		]);
		await initConstraints();
		expect(dbRun).not.toHaveBeenCalledWith(
			'CREATE CONSTRAINT ON (s:Dog) ASSERT s.tail IS UNIQUE'
		);
	});

	it("doesn't create an existence constraint if it does exist", async () => {
		mockConstraints(dbRun, ['CONSTRAINT ON (s:Dog) ASSERT exists(s.nose)']);
		schema.getTypes.mockReturnValue([
			{ name: 'Dog', properties: { nose: { required: true } } }
		]);
		await initConstraints();
		expect(dbRun).not.toHaveBeenCalledWith(
			'CREATE CONSTRAINT ON (s:Dog) ASSERT exists(s.tail)'
		);
	});

	it('handles a mixture of creates, ignores and removes', async () => {
		mockConstraints(dbRun, [
			'CONSTRAINT ON (s:Dog) ASSERT s.nose IS UNIQUE',
			'CONSTRAINT ON (s:Dog) ASSERT exists(s.tail)',
			'CONSTRAINT ON (s:Cat) ASSERT exists(s.tail)'
		]);
		schema.getTypes.mockReturnValue([
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
		].forEach(query => expect(dbRun).toHaveBeenCalledWith(query));
	});

	it('handles failure gracefully', async () => {
		schema.getTypes.mockReturnValue([]);
		mockConstraints(dbRun, [], Promise.reject('db call has failed'));
		// this should not throw
		await initConstraints();
	});
});
