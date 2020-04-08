const {
	code,
	deleteConfirmText,
} = require('../../../test-helpers/mainTypeData.json');
const {
	createType,
	visitEditPage,
	visitMainTypePage,
	pickChild,
	save,
} = require('../../../test-helpers/cypress');

describe('End-to-end - delete record', () => {
	beforeEach(() => {
		cy.wrap(createType({ code, type: 'MainType' })).then(() => {
			visitMainTypePage();
		});
	});

	it('shows a prompt message', () => {
		cy.visit(`/MainType/${code}`, {
			onBeforeLoad(win) {
				cy.stub(win, 'confirm').returns(false);
			},
		});

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', `${code}`);

		cy.get('[data-button-type="delete"]').click();

		cy.window().then(win => {
			cy.wrap(win)
				.its('confirm')
				.should('called', 1);
			cy.wrap(win)
				.its('confirm.args.0')
				.should('deep.eq', [deleteConfirmText]);
		});
		cy.get('#code').should('have.text', `${code}`);
	});

	it('can not delete a record with relationship', () => {
		cy.visit(`/MainType/${code}`, {
			onBeforeLoad(win) {
				cy.stub(win, 'confirm').returns(true);
			},
		});

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.wrap(
			createType({ code: `${code}-child`, type: 'ChildType' }, false),
		);
		visitEditPage();
		cy.url().should('contain', `/MainType/${code}/edit`);
		pickChild();
		save();

		cy.get('[data-button-type="delete"]').click();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#children>li')
			.eq(0)
			.should('have.text', `${code}-child`)
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-child`);
		cy.get('.o-message__content-main').should(
			'contain',
			`Oops. Could not delete MainType record for ${code}`,
		);
		cy.get('.o-message__content-additional').should(
			'contain',
			`Cannot delete - MainType ${code} has relationships.`,
		);
	});

	it('can delete a record', () => {
		cy.visit(`/MainType/${code}`, {
			onBeforeLoad(win) {
				cy.stub(win, 'confirm').returns(true);
			},
		});

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);

		cy.get('[data-button-type="delete"]').click();

		cy.get('#code').should('not.exist');
	});
});
