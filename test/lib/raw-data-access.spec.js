const rawData = require('../../lib/raw-data');

describe('raw data access', () => {
	const dummySchema = {
		schema: {
			types: ['type1', 'type2'],
			stringPatterns: ['sp1', 'sp2'],
			enums: ['enum1', 'enum2'],
		},
		version: 1,
	};
	beforeAll(() => {
		rawData.set(dummySchema);
	});
	it('getTypes retrieves types', () => {
		expect(rawData.getTypes()).toEqual(dummySchema.schema.types);
	});
	it('getStringPatterns retrieves string patterns', () => {
		expect(rawData.getStringPatterns()).toEqual(
			dummySchema.schema.stringPatterns,
		);
	});
	it('getEnums retrieves enums', () => {
		expect(rawData.getEnums()).toEqual(dummySchema.schema.enums);
	});
	it('getVersion retrieves version', () => {
		expect(rawData.getVersion()).toEqual(dummySchema.version);
	});
	it('getAll retrieves entire object', () => {
		expect(rawData.getAll()).toEqual(dummySchema);
	});

	describe('overriding existing schema', () => {
		const newDummySchema = {
			schema: {
				types: ['type3', 'type4'],
				stringPatterns: ['sp3', 'sp4'],
				enums: ['enum3', 'enum4'],
			},
			version: 2,
		};
		beforeAll(() => {
			rawData.set(newDummySchema);
		});
		it('getTypes retrieves types', () => {
			expect(rawData.getTypes()).toEqual(newDummySchema.schema.types);
		});
		it('getStringPatterns retrieves string patterns', () => {
			expect(rawData.getStringPatterns()).toEqual(
				newDummySchema.schema.stringPatterns,
			);
		});
		it('getEnums retrieves enums', () => {
			expect(rawData.getEnums()).toEqual(newDummySchema.schema.enums);
		});
		it('getVersion retrieves version', () => {
			expect(rawData.getVersion()).toEqual(newDummySchema.version);
		});
		it('getAll retrieves entire object', () => {
			expect(rawData.getAll()).toEqual(newDummySchema);
		});
	});
});
