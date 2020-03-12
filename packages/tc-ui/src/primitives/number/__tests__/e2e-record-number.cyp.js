const {
	code,
	someString,
	someInteger,
} = require('../../../test-helpers/mainTypeData.json');
const {
	populateMinimumViableFields,
	save,
	resetDb,
	visitEditPage
} = require('../../../test-helpers/cypress');

describe('End-to-end - record Number type', () => {
	beforeEach(() => {
		cy.wrap(resetDb()).then(() => {
			populateMinimumViableFields(code);
		});
	});

	describe('int', () => {

		it('can record an integer', () => {
			cy.get('input[name=someInteger]').type(someInteger);
			save();

			cy.get('#code').should('have.text', code);
			cy.get('#someString').should('have.text', someString);
			cy.get('#someInteger').should('have.text', String(someInteger));
		});

		it('rejects floats', () => {
			cy.get('input[name=someInteger]').type('0.5');
			save();

			cy.url().should('contain', '/MainType/create');
			cy.get('.o-message__content-main').should(
				'contain',
				'Oops. Could not create MainType record for e2e-demo',
			);
			cy.get('.o-message__content-additional').should(
				'contain',
				`Invalid value \`0.5\` for property \`someInteger\` on type \`MainType\`: Must be a finite integer`,
			);
		});

		it('rejects text', () => {
			cy.get('input[name=someInteger]').type('haha');
			save();

			cy.url().should('contain', '/MainType/create');
			cy.get('.o-message__content-main').should(
				'contain',
				'Oops. Could not create MainType record for e2e-demo',
			);
			cy.get('.o-message__content-additional').should(
				'contain',
				`Invalid value \`haha\` for property \`someInteger\` on type \`MainType\`: Must be a finite integer`,
			);
		});

		it('saves and redisplays zero', () => {
			cy.get('input[name=someInteger]').type('0');
			save();

			cy.url().should('contain', '/MainType/create');
			cy.get('#someInteger').should('have.text', '0');
			visitEditPage()
			cy.get('input[name=someInteger]').should('have.value', '0');
		});
	})
});
