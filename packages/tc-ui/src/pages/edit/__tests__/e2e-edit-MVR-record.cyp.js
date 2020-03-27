const { code, someString } = require('../../../test-helpers/mainTypeData.json');
const {
	populateMinimumViableFields,
	populateChildTypeFields,
	visitMVRTypePage,
	visitEditPage,
	save,
	resetDb,
} = require('../../../test-helpers/cypress');

describe('End-to-end - edit MVR record', () => {
	beforeEach(() => {
		cy.wrap(resetDb()).then(() => {
			populateMinimumViableFields(code);
			save();
		});
	});

	it('can not edit code of record', () => {
		cy.url().should('contain', `/MVRType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);
		cy.get('#children>li')
			.eq(0)
			.should('have.text', `${code}-first-child`)
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);

		visitEditPage();
		cy.get('input[name=code]').type('-test');
		save();

		cy.url().should('contain', `/MVRType/${code}/edit`);
		cy.get('.o-message__content-main').should(
			'contain',
			'Oops. Could not update MVRType record for e2e-demo.',
		);
		cy.get('.o-message__content-additional').should(
			'contain',
			`Conflicting code property \`e2e-demo-test\` in payload for MVRType e2e-demo`,
		);
	});

	it('can edit other minimum viable fields of a record', () => {
		cy.url().should('contain', `/MVRType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);

		populateChildTypeFields(`${code}-second-child`);
		save();

		cy.url().should('contain', `/ChildType/${code}-second-child`);
		visitMVRTypePage();
		visitEditPage();

		cy.get('input[name=someString]').type(` - updated`);
		cy.get(
			'[data-name=e2e-demo-first-child] button.relationship-remove-button',
		).click({
			force: true,
		});
		cy.get('#children-picker') // eslint-disable-line cypress/no-unnecessary-waiting
			.type('e2e-demo-sec')
			.wait(500)
			.type('{downarrow}{enter}');
		save();

		cy.url().should('contain', `/MVRType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', `${someString} - updated`);
		cy.get('#children>li')
			.eq(0)
			.should('have.text', `${code}-second-child`)
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-second-child`);
	});
});
