const { diffProperties } = require('../diff');

describe('diffProperties test (internal function)', () => {
	test('returns exact added entries', () => {
		const initialContent = {
			propertyOne: 'prop-1',
			propertyTwo: 'prop-2',
		};
		const newContent = {
			propertyTwo: 'prop-2',
			propertyThree: 'prop-3',
		};

		const result = diffProperties(newContent, initialContent);
		expect(result).toMatchObject({
			propertyThree: 'prop-3',
		});
	});
	test('returns empty object when object is same', () => {
		const initialContent = {
			propertyOne: 'prop-1',
			propertyTwo: 'prop-2',
		};
		const newContent = {
			propertyOne: 'prop-1',
			propertyTwo: 'prop-2',
		};

		const result = diffProperties(newContent, initialContent);
		expect(Object.keys(result)).toHaveLength(0);
	});
});
