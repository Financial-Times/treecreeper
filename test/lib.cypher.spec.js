const { query, res } = require('../server/lib/cypher.js');
const { expect } = require('chai');

describe('cypher query creation helpers', () => {
	describe('stringify', () => {
		it('serializes a simple object', () => {
			const simple = { id: 1, name: 'mahaugha' };
			expect(query.stringify(simple)).to.be.string(
				"{ id: 1, name: 'mahaugha' }"
			);
		});

		it('serializes a complex object', () => {
			const complex = {
				id: 2,
				update: { s3id: 'monkey', url: 'https://s3.com/monkey' }
			};
			expect(query.stringify(complex)).to.be.string(
				"{ id: 2, update: { s3id: 'monkey', url: 'https://s3.com/monkey' }"
			);
		});
	});
});

describe('neo4j response helpers ', () => {
	const data = [
		{
			keys: ['supplier', 'submission'],
			length: 2,
			_fields: [
				{
					identity: {
						low: 312,
						high: 0
					},
					labels: ['Supplier'],
					properties: {
						name: 'Worker Xp Ltd',
						id: 'a0zL0000004cdWGIAY'
					}
				},
				{
					identity: {
						low: 313,
						high: 0
					},
					labels: ['Submission'],
					properties: {
						contractId: '',
						surveyId: 'company-info',
						supplierId: 'a0zL0000004cdWGIAY',
						id: 'company-infoa0zL0000004cdWGIAY',
						type: 'topLevel',
						status: 'pending'
					}
				}
			],
			_fieldLookup: {
				supplier: 0,
				submission: 1
			}
		}
	];
	describe('parse', () => {
		it('returns the response in the required format', () => {
			const result = res.parse(data);
			const expected = [
				{
					supplier: {
						identity: {
							low: 312,
							high: 0
						},
						labels: ['Supplier'],
						properties: {
							name: 'Worker Xp Ltd',
							id: 'a0zL0000004cdWGIAY'
						}
					},
					submission: {
						identity: {
							low: 313,
							high: 0
						},
						labels: ['Submission'],
						properties: {
							contractId: '',
							surveyId: 'company-info',
							supplierId: 'a0zL0000004cdWGIAY',
							id: 'company-infoa0zL0000004cdWGIAY',
							type: 'topLevel',
							status: 'pending'
						}
					}
				}
			];
			expect(result).to.deep.equal(expected);
		});
	});

	describe('mapKeyToField', () => {
		it('takes a neo4j response record and maps key names to field data', () => {
			const expected = {
				supplier: {
					identity: { low: 312, high: 0 },
					labels: ['Supplier'],
					properties: { name: 'Worker Xp Ltd', id: 'a0zL0000004cdWGIAY' }
				}
			};
			expect(res.mapKeyToField(data[0])({}, 'supplier')).to.deep.equal(
				expected
			);
		});
	});
	describe('uniqueRowsByKey', () => {
		const data = [
			{ id: '1' },
			{ id: '2' },
			{ id: '1' },
			{ id: '3' },
			{ id: '2' },
			{ id: '5' },
			{ id: '17' }
		];
		it('returns true if this is the first instance in the array', () => {
			expect(res.uniqueRowsByKey('id')(data[0], 0, data)).to.be.true;
		});

		it('returns false if this is the not first instance in the array', () => {
			expect(res.uniqueRowsByKey('id')(data[2], 2, data)).to.be.false;
		});

		it('works to filter unique elements in an array', () => {
			const expected = [
				{ id: '1' },
				{ id: '2' },
				{ id: '3' },
				{ id: '5' },
				{ id: '17' }
			];
			const result = data.filter(res.uniqueRowsByKey('id'));
			expect(result).to.have.length(5);
			expect(result).to.deep.equal(expected);
		});
	});

	describe('uniquePropertiesByKey', () => {
		const data = [
			{ submission: { properties: { id: 1, name: 'one' } } },
			{ submission: { properties: { id: 5, name: 'five' } } },
			{ submission: { properties: { id: 4, name: 'four' } } },
			{ submission: { properties: { id: 1, name: 'one' } } },
			{ submission: { properties: { id: 2, name: 'two' } } },
			{ submission: { properties: { id: 1, name: 'one' } } }
		];

		it('finds all unique properties within a neo4j response based on the supplied key, (key id is used to determine uniqueness)', () => {
			const result = res.uniquePropertiesByKey('submission', data);
			const expected = [
				{ id: 1, name: 'one' },
				{ id: 5, name: 'five' },
				{ id: 4, name: 'four' },
				{ id: 2, name: 'two' }
			];
			expect(result).to.deep.equal(expected);
		});

		it('can use a different property filter', () => {
			const result = res.uniquePropertiesByKey('submission', data, 'name');
			const expected = [
				{ id: 1, name: 'one' },
				{ id: 5, name: 'five' },
				{ id: 4, name: 'four' },
				{ id: 2, name: 'two' }
			];
			expect(result).to.deep.equal(expected);
		});
	});
});
