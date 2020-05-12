const schema = require('@financial-times/tc-schema-sdk');

schema.init();
const { initConstraints } = require('..');
const { driver } = require('../db-connection');

const mockConstraints = ({
	stub,
	constraints = [],
	indexes = [],
	writeResponse,
} = {}) => {
	stub.mockImplementation(query => {
		if (query === 'CALL db.constraints') {
			return Promise.resolve({
				records: constraints.map(val => ({
					get: () => val,
				})),
			});
		}

		if (query === 'CALL db.indexes') {
			return Promise.resolve({
				records: indexes.map(val => ({
					get: () => val,
				})),
			});
		}

		return (
			writeResponse ||
			Promise.resolve({
				records: [],
			})
		);
	});
};

describe('creating db constraints and indexes', () => {
	let dbRun;
	beforeEach(() => {
		jest.spyOn(schema, 'getTypes');
		jest.spyOn(driver, 'session').mockReturnValue({
			run: (dbRun = jest.fn()),
			close: () => null,
		});
	});

	afterEach(() => jest.restoreAllMocks());

	it("creates a uniqueness constraint if it doesn't exist", async () => {
		mockConstraints({
			stub: dbRun,
			constraints: ['CONSTRAINT ON (s:Dog) ASSERT s.nose IS UNIQUE'],
		});
		schema.getTypes.mockReturnValue([
			{ name: 'Dog', properties: { tail: { unique: true } } },
		]);
		await initConstraints();
		expect(dbRun).toHaveBeenCalledWith(
			'CREATE CONSTRAINT ON (s:Dog) ASSERT s.tail IS UNIQUE',
		);
		expect(dbRun).toHaveBeenCalledTimes(5);
	});
	// ignore this test until we upgrade to enterprise adiition - community edition doesn't have exists()
	it.skip("creates an existence constraint if it doesn't exist", async () => {
		mockConstraints({
			stub: dbRun,
			constraints: ['CONSTRAINT ON (s:Dog) ASSERT exists(s.nose)'],
		});
		schema.getTypes.mockReturnValue([
			{ name: 'Dog', properties: { tail: { required: true } } },
		]);
		await initConstraints();
		expect(dbRun).toHaveBeenCalledWith(
			'CREATE CONSTRAINT ON (s:Dog) ASSERT exists(s.tail)',
		);
	});

	it("doesn't create a uniqueness constraint if it does exist", async () => {
		mockConstraints({
			stub: dbRun,
			constraints: ['CONSTRAINT ON (s:Dog) ASSERT s.nose IS UNIQUE'],
		});
		schema.getTypes.mockReturnValue([
			{ name: 'Dog', properties: { nose: { unique: true } } },
		]);
		await initConstraints();
		expect(dbRun).not.toHaveBeenCalledWith(
			'CREATE CONSTRAINT ON (s:Dog) ASSERT s.nose IS UNIQUE',
		);
		expect(dbRun).toHaveBeenCalledTimes(4);
	});

	// ignore this test until we upgrade to enterprise adiition - community edition doesn't have exists()
	it.skip("doesn't create an existence constraint if it does exist", async () => {
		mockConstraints({
			stub: dbRun,
			constraints: ['CONSTRAINT ON (s:Dog) ASSERT exists(s.nose)'],
		});
		schema.getTypes.mockReturnValue([
			{ name: 'Dog', properties: { nose: { required: true } } },
		]);
		await initConstraints();
		expect(dbRun).not.toHaveBeenCalledWith(
			'CREATE CONSTRAINT ON (s:Dog) ASSERT exists(s.nose)',
		);
		expect(dbRun).toHaveBeenCalledTimes(4);
	});

	it('creates a index for canIdentify property if it doesnt exist', async () => {
		mockConstraints({
			stub: dbRun,
			indexes: ['CREATE INDEX ON :Dog(nose)'],
		});
		schema.getTypes.mockReturnValue([
			{ name: 'Dog', properties: { tail: { canIdentify: true } } },
		]);
		await initConstraints();
		expect(dbRun).toHaveBeenCalledWith('CREATE INDEX ON :Dog(tail)');
		expect(dbRun).toHaveBeenCalledTimes(5);
	});

	it('doesnt create an index for a canIdentify property if it does exist', async () => {
		mockConstraints({
			stub: dbRun,
			indexes: ['CREATE INDEX ON :Dog(nose)'],
		});
		schema.getTypes.mockReturnValue([
			{ name: 'Dog', properties: { nose: { canIdentify: true } } },
		]);
		await initConstraints();
		expect(dbRun).not.toHaveBeenCalledWith('CREATE INDEX ON :Dog(nose)');

		expect(dbRun).toHaveBeenCalledTimes(4);
	});

	it('doesnt create an index if a uniqueness constraint will be created', async () => {
		mockConstraints({
			stub: dbRun,
		});
		schema.getTypes.mockReturnValue([
			{
				name: 'Dog',
				properties: { tail: { canIdentify: true, unique: true } },
			},
		]);
		await initConstraints();
		expect(dbRun).not.toHaveBeenCalledWith('CREATE INDEX ON :Dog(tail)');
		expect(dbRun).toHaveBeenCalledWith(
			'CREATE CONSTRAINT ON (s:Dog) ASSERT s.tail IS UNIQUE',
		);
		expect(dbRun).toHaveBeenCalledTimes(5);
	});

	// ignore this test until we upgrade to enterprise adiition - community edition doesn't have exists()
	it.skip('handles a mixture of creates, ignores and removes', async () => {
		mockConstraints({
			stub: dbRun,
			constraints: [
				'CONSTRAINT ON (s:Dog) ASSERT s.nose IS UNIQUE',
				'CONSTRAINT ON (s:Dog) ASSERT exists(s.tail)',
				'CONSTRAINT ON (s:Cat) ASSERT exists(s.tail)',
			],
		});
		schema.getTypes.mockReturnValue([
			{
				name: 'Dog',
				properties: {
					tail: { unique: true },
					nose: { unique: true, required: true },
				},
			},
			{ name: 'Cat', properties: { whiskers: { required: true } } },
		]);
		await initConstraints();

		[
			'CREATE CONSTRAINT ON (s:Dog) ASSERT s.tail IS UNIQUE',
			'CREATE CONSTRAINT ON (s:Dog) ASSERT exists(s.nose)',
			'CREATE CONSTRAINT ON (s:Cat) ASSERT exists(s.whiskers)',
		].forEach(query => expect(dbRun).toHaveBeenCalledWith(query));
	});

	it('handles failure gracefully', async () => {
		schema.getTypes.mockReturnValue([]);
		mockConstraints({
			stub: dbRun,
			writeResponse: Promise.reject(new Error('db call has failed')),
		});
		// this should not throw
		await initConstraints();
	});
});
