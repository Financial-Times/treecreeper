const {
	code,
	someString,
} = require('../../../../../cypress/fixtures/mainTypeData.json');
const {
	populateMinimumViableFields,
	visitEditPage,
	save,
	resetDb,
} = require('../../test-helpers');

describe('End-to-end - record Boolean type', () => {
	beforeEach(() => {
		resetDb();
		populateMinimumViableFields(code);
		cy.get('#radio-someBoolean-Yes').check({ force: true });
		save();
	});

	it('can record a value', () => {
		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);
		cy.get('#someBoolean').should('have.text', 'Yes');
	});

	it('can change a value', () => {
		visitEditPage();
		cy.get('#radio-someBoolean-No').check({ force: true });
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);
		cy.get('#someBoolean').should('have.text', 'No');
	});
});
