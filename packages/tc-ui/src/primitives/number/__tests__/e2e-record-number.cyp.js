const {
	code,
	someInteger,
} = require('../../../test-helpers/mainTypeData.json');
const {
	createType,
	visitMainTypePage,
	save,
	visitEditPage,
} = require('../../../test-helpers/cypress');

describe('End-to-end - record Number type', () => {
	beforeEach(() => {
		cy.wrap(createType({ code, type: 'MainType' })).then(() => {
			visitMainTypePage();
			visitEditPage();
		});
	});

	describe('int', () => {
		it('can record an integer', () => {
			cy.get('input[name=someInteger]').type(someInteger);
			save();

			cy.get('#code').should('have.text', code);
			cy.get('#someInteger').should('have.text', String(someInteger));
		});

		it('rejects floats', () => {
			cy.get('input[name=someInteger]').type(0.5);
			save();

			cy.url().should('contain', `/MainType/${code}/edit`);
			cy.get('.o-message__content-main').should(
				'contain',
				'Oops. Could not update MainType record for e2e-demo',
			);
			cy.get('.o-message__content-additional').should(
				'contain',
				`Invalid value \`0.5\` for property \`someInteger\` on type \`MainType\`: Must be a finite integer`,
			);
		});

		it('rejects text', () => {
			cy.get('input[name=someInteger]').type('haha');
			save();

			cy.url().should('contain', `/MainType/${code}/edit`);
			cy.get('.o-message__content-main').should(
				'contain',
				'Oops. Could not update MainType record for e2e-demo',
			);
			cy.get('.o-message__content-additional').should(
				'contain',
				`Invalid value \`haha\` for property \`someInteger\` on type \`MainType\`: Must be a finite integer`,
			);
		});

		it('saves and redisplays zero', () => {
			cy.get('input[name=someInteger]').type(0);
			save();

			cy.url().should('contain', '/MainType/e2e-demo');
			cy.get('#someInteger').should('have.text', '0');
			visitEditPage();
			cy.get('input[name=someInteger]').should('have.value', '0');
		});

		it('does not parse empty input to zero', () => {
			save();
			cy.url().should('contain', '/MainType/e2e-demo');
			cy.get('#someInteger').should('not.exist');
			visitEditPage();
			cy.get('input[name=someInteger]').should('have.value', '');
		});
	});

	describe('float', () => {
		it('can record an integer', () => {
			cy.get('input[name=someFloat]').type(someInteger);
			save();

			cy.get('#code').should('have.text', code);
			cy.get('#someFloat').should('have.text', String(someInteger));
		});

		it('accepts floats', () => {
			cy.get('input[name=someFloat]').type(0.5);
			save();

			cy.url().should('contain', '/MainType/e2e-demo');
			cy.get('#someFloat').should('have.text', '0.5');
		});

		it('rejects text', () => {
			cy.get('input[name=someFloat]').type('haha');
			save();

			cy.url().should('contain', `/MainType/${code}/edit`);
			cy.get('.o-message__content-main').should(
				'contain',
				'Oops. Could not update MainType record for e2e-demo',
			);
			cy.get('.o-message__content-additional').should(
				'contain',
				`Invalid value \`haha\` for property \`someFloat\` on type \`MainType\`: Must be a finite floating point number`,
			);
		});

		it('saves and redisplays zero', () => {
			cy.get('input[name=someFloat]').type(0);
			save();

			cy.url().should('contain', '/MainType/e2e-demo');
			cy.get('#someFloat').should('have.text', '0');
			visitEditPage();
			cy.get('input[name=someFloat]').should('have.value', '0');
		});
	});
});
