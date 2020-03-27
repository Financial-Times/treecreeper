const {
	code,
	anotherString,
} = require('../../../test-helpers/mainTypeData.json');
const {
	createType,
	visitMainTypePage,
	visitEditPage,
	save,
	resetDb,
} = require('../../../test-helpers/cypress');

describe('End-to-end - record Text type', () => {
	it('can record a text', () => {
		cy.wrap(resetDb()).then(() => {
			cy.wrap(createType({ code, type: 'MainType' })).then(() => {
				visitMainTypePage();
				visitEditPage();
			});
			cy.get('input[name=anotherString]').type(anotherString);
			save();

			cy.get('#code').should('have.text', code);
			cy.get('#anotherString').should('have.text', anotherString);
		});
	});
});
