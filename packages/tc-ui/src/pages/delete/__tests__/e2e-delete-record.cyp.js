const {
	code,
	someString,
	deleteConfirmText,
} = require('../../../test-helpers/mainTypeData.json');
const {
	populateChildTypeFields,
	visitEditPage,
	visitMVRTypePage,
	pickChild,
	save,
	resetDb,
} = require('../../../test-helpers/cypress');

describe('End-to-end - delete record', () => {
	beforeEach(() => {
		cy.wrap(resetDb()).then(() => {
			cy.visit(`/MVRType/create`, {
				onBeforeLoad(win) {
					cy.stub(win, 'prompt').returns('SAVE INCOMPLETE RECORD');
				},
			});
			cy.get('input[name=code]').type(`${code}`);
			cy.get('input[name=someString]').type(someString);
			save();
		});
	});

	it('shows a prompt message', () => {
		cy.visit(`/MVRType/${code}`, {
			onBeforeLoad(win) {
				cy.stub(win, 'confirm').returns(false);
			},
		});

		cy.url().should('contain', `/MVRType/${code}`);
		cy.get('#code').should('have.text', `${code}`);
		cy.get('#someString').should('have.text', someString);

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
		cy.get('#someString').should('have.text', someString);
	});

	it('can not delete a record with relationship', () => {
		cy.visit(`/MVRType/${code}`, {
			onBeforeLoad(win) {
				cy.stub(win, 'confirm').returns(true);
			},
		});

		cy.url().should('contain', `/MVRType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);

		populateChildTypeFields(`${code}-child`);
		save();
		// create relationship
		visitMVRTypePage();
		visitEditPage();
		cy.url().should('contain', `/MVRType/${code}/edit`);
		pickChild();
		save();

		cy.get('[data-button-type="delete"]').click();

		cy.url().should('contain', `/MVRType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);
		cy.get('#children>li')
			.eq(0)
			.should('have.text', `${code}-child`)
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-child`);
		cy.get('.o-message__content-main').should(
			'contain',
			`Oops. Could not delete MVRType record for ${code}`,
		);
		cy.get('.o-message__content-additional').should(
			'contain',
			`Cannot delete - MVRType ${code} has relationships.`,
		);
	});

	it('can delete a record', () => {
		cy.visit(`/MVRType/${code}`, {
			onBeforeLoad(win) {
				cy.stub(win, 'confirm').returns(true);
			},
		});

		cy.url().should('contain', `/MVRType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);

		cy.get('[data-button-type="delete"]').click();

		cy.get('#code').should('not.exist');
		cy.get('#someString').should('not.exist');
		cy.get('#children').should('not.exist');
	});
});
