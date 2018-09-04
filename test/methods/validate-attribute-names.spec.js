const sinon = require('sinon');
const { validateAttributeNames } = require('../../');

describe('validateAttributeNames', () => {
		it('accept camel case strings', () => {
			expect(() =>
				validateAttributeNames({'thing': {}, thing2: {}, thingWithThing: {}})
			).not.to.throw();
		});
		it('rejectOddCapitalisation', () => {
			expect(() => validateAttributeNames({Thing: {}})).to.throw();
		});
		it('reject hyphens', () => {
			expect(() => validateAttributeNames({'thi-ng': {}} )).to.throw();
		});
});
