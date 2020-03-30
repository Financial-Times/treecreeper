const { code } = require('../../../test-helpers/mainTypeData.json');
const {
	visitMainTypePage,
	visitEditPage,
	createType,
	save,
} = require('../../../test-helpers/cypress');

describe('End-to-end - record Enum type', () => {
	beforeEach(() => {
		cy.wrap(createType({ code, type: 'MainType' })).then(() =>
			visitMainTypePage(),
		);
	});

	it('can record a selection', () => {
		visitEditPage();
		cy.get('select[name=someEnum]').select('First');
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someEnum').should('have.text', 'First');
	});

	it('can select a different value', () => {
		visitEditPage();
		cy.get('select[name=someEnum]').select('Third');
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someEnum').should('have.text', 'Third');
	});
});
