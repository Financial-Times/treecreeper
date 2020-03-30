const {
	code,
	someDocument,
} = require('../../../test-helpers/mainTypeData.json');
const {
	createType,
	visitMainTypePage,
	visitEditPage,
	save,
} = require('../../../test-helpers/cypress');

describe('End-to-end - record LargeText type', () => {
	it('can record large text', () => {
		cy.wrap(createType({ code, type: 'MainType' })).then(() => {
			visitMainTypePage();
			visitEditPage();
			cy.get('textarea[name=someDocument]').type(someDocument);
			save();

			cy.get('#code').should('have.text', code);
			cy.get('#someDocument').should('have.text', someDocument);
		});
	});
});
