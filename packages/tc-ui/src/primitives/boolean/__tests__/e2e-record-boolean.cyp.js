const { code } = require('../../../test-helpers/mainTypeData.json');
const {
	createType,
	visitMainTypePage,
	visitEditPage,
	save,
} = require('../../../test-helpers/cypress');

describe('End-to-end - record Boolean type', () => {
	beforeEach(() => {
		cy.wrap(createType({ code, type: 'MainType' })).then(() =>
			visitMainTypePage(),
		);
	});

	it('can record a value', () => {
		visitEditPage();
		cy.get('#radio-someBoolean-Yes').check({ force: true });
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someBoolean').should('have.text', 'Yes');
	});

	it('can change a value', () => {
		visitEditPage();
		cy.get('#radio-someBoolean-No').check({ force: true });
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someBoolean').should('have.text', 'No');
	});
});
