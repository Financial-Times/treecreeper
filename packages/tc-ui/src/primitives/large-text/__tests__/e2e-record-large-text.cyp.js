const {
	code,
	someString,
	someDocument,
} = require('../../../test-helpers/mainTypeData.json');
const {
	populateMinimumViableFields,
	save,
	resetDb,
} = require('../../../test-helpers');

describe('End-to-end - record LargeText type', () => {
	it('can record large text', () => {
		resetDb();
		populateMinimumViableFields(code);
		cy.get('textarea[name=someDocument]').type(someDocument);
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);
		cy.get('#someDocument').should('have.text', someDocument);
	});
});
