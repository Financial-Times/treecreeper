const { code, someString } = require('../../../test-helpers/mainTypeData.json');
const {
	populateMinimumViableFields,
	visitEditPage,
	save,
	resetDb,
} = require('../../../test-helpers/cypress');

describe('End-to-end - record Enum type', () => {
	beforeEach(() => {
		cy.wrap(resetDb()).then(() => {
			populateMinimumViableFields(code);
			cy.get('select[name=someEnum]').select('First');
			save();
		});
	});

	it('can record a selection', () => {
		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);
		cy.get('#someEnum').should('have.text', 'First');
	});

	it('can select a different value', () => {
		visitEditPage();
		cy.get('select[name=someEnum]').select('Third');
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);
		cy.get('#someEnum').should('have.text', 'Third');
	});
});
