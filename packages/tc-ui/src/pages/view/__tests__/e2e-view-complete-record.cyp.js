const { code, someString } = require('../../../test-helpers/mainTypeData.json');
const {
	createType,
	pickChild,
	visitMainTypePage,
	visitEditPage,
	populateMainTypeFields,
	save,
	resetDb,
	assertMainTypeFields,
} = require('../../../test-helpers/cypress');

describe('End-to-end - record creation', () => {
	beforeEach(() => {
		resetDb();
	});

	it('can display MVRType record', () => {
		cy.wrap().then(() =>
			createType({ code: `${code}-child`, type: 'ChildType' }),
		);
		cy.visit(`/MVRType/create`);
		cy.get('input[name=code]').type(code);
		cy.get('input[name=someString]').type(someString);
		pickChild();
		save();

		cy.url().should('contain', `/MVRType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);
		cy.get('#children li').then(children => {
			cy.wrap(children)
				.eq(0)
				.find('a')
				.should('have.text', `${code}-child`)
				.should('have.attr', 'href', `/ChildType/${code}-child`);
		});
	});

	it('can display MainType record', () => {
		cy.wrap().then(() => createType({ code, type: 'MainType' }));
		visitMainTypePage();
		visitEditPage();
		populateMainTypeFields(code);
		save();

		assertMainTypeFields();
	});
});
