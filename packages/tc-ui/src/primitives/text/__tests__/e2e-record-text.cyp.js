const {
	code,
	someString,
	anotherString,
} = require('../../../../../../cypress/fixtures/mainTypeData.json');
const {
	populateMinimumViableFields,
	save,
	resetDb,
} = require('../../../../../../cypress/test-helpers');

describe('End-to-end - record Text type', () => {
	it('can record a text', () => {
		resetDb();
		populateMinimumViableFields(code);
		cy.get('input[name=anotherString]').type(anotherString);
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);
		cy.get('#anotherString').should('have.text', anotherString);
	});
});
