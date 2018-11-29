const getType = require('../../methods/get-type');
const { validateRelationship } = require('../../');
const cache = require('../../lib/cache');

jest.mock('../../methods/get-type');

const startType = {
	name: 'StartType',
	properties: {
		testRelationship: {
			type: 'EndType',
			direction: 'outgoing',
			relationship: 'HAS',
			hasMany: false
		}
	}
};

describe('validateRelationship', () => {
	beforeEach(() => {
		jest.mock('../../methods/get-type');
	});

	afterEach(() => {
		jest.clearAllMocks();
		cache.clear();
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	it('reject when start node type is invalid', () => {
		getType.mockReturnValue(undefined);
		expect(() =>
			validateRelationship({
				nodeType: 'NotType',
				relatedType: 'Thing',
				relationshipType: 'HAS',
				relatedCode: 'code'
			})
		).toThrowError(/Invalid node type/);
	});
	it('reject when related node type is invalid', () => {
		getType.mockImplementation(type =>
			type === 'StartType' ? startType : undefined
		);
		expect(() =>
			validateRelationship({
				nodeType: 'StartType',
				relatedType: 'NoType',
				relationshipType: 'HAS',
				relatedCode: 'code'
			})
		).toThrowError(/not a valid relationship between/);
	});

	it('reject when related node code is invalid', () => {
		getType.mockImplementation(type =>
			type === 'StartType'
				? startType
				: {
						name: 'EndType',
						properties: {
							code: { validator: /^[a-z]+$/, type: 'String' }
						}
				  }
		);
		expect(() =>
			validateRelationship({
				nodeType: 'StartType',
				relatedType: 'EndType',
				relationshipType: 'HAS',
				relatedCode: 'CODE'
			})
		).toThrowError(/Invalid attributeValue `CODE` for property `code` on type `EndType`/);
	});

	it('reject when relationship not defined on start node', () => {
		getType.mockImplementation(type => (type === 'StartType' ? startType : {}));
		expect(() =>
			validateRelationship({
				nodeType: 'StartType',
				relatedType: 'EndType',
				relationshipType: 'HASNT',
				relatedCode: 'code'
			})
		).toThrowError(/not a valid relationship on/);
	});

	it('reject when relationship not defined between start node and end node', () => {
		getType.mockImplementation(type => (type === 'StartType' ? startType : {}));
		expect(() =>
			validateRelationship({
				nodeType: 'StartType',
				relatedType: 'OtherType',
				relationshipType: 'HAS',
				relatedCode: 'code'
			})
		).toThrowError(/not a valid relationship between/);
	});

	it('reject when relationship not defined in correct direction  between start node and end node', () => {
		getType.mockImplementation(type =>
			type === 'StartType'
				? {
						name: 'StartType',
						properties: {
							code: { validator: /^[a-z]+$/, type: 'String' },
							testRelationship: {
								type: 'EndType',
								direction: 'outgoing',
								relationship: 'HAS',
								hasMany: false
							}
						}
				  }
				: {
						name: 'EndType',
						properties: {
							testRelationship: {
								type: 'EndType',
								direction: 'incoming',
								relationship: 'HAS',
								hasMany: false
							}
						}
				  }
		);
		expect(() =>
			validateRelationship({
				nodeType: 'EndType',
				relatedType: 'StartType',
				relationshipType: 'HAS',
				relatedCode: 'code'
			})
		).toThrowError(/not a valid relationship between/);
	});

	it('accept when all is correct', () => {
		getType.mockImplementation(type =>
			type === 'StartType'
				? startType
				: {
						name: 'EndType',
						properties: {
							code: { validator: /^[a-z]+$/, type: 'String' }
						}
				  }
		);
		expect(() =>
			validateRelationship({
				nodeType: 'StartType',
				relatedType: 'EndType',
				relationshipType: 'HAS',
				relatedCode: 'code'
			})
		).not.toThrowError();
	});
});
