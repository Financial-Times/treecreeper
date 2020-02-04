const {
	code,
	anotherDocument,
	someString,
	someEnum,
} = require('../../../../../../cypress/fixtures/mainTypeData.json');
const {
	populateMinimumViableFields,
	populateChildTypeFields,
	visitMainTypePage,
	visitEditPage,
	save,
	resetDb,
} = require('../../../../../../cypress/test-helpers');

describe('End-to-end - edit record', () => {
	beforeEach(() => {
		resetDb();
		populateMinimumViableFields(code);
		save();
	});

	it('can not edit code of record', () => {
		cy.url().should('contain', `/MainType/${code}`);
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

		cy.url().should('contain', `/MainType/${code}/edit`);
		cy.get('.o-message__content-main').should(
			'contain',
			'Oops. Could not update MainType record for e2e-demo.',
		);
		cy.get('.o-message__content-additional').should(
			'contain',
			`Conflicting code property \`e2e-demo-test\` in payload for MainType e2e-demo`,
		);
	});

	it('can edit other minimum viable fields of a record', () => {
		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);

		populateChildTypeFields(`${code}-second-child`);
		save();

		cy.url().should('contain', `/ChildType/${code}-second-child`);
		visitMainTypePage();
		visitEditPage();

		cy.get('input[name=someString]').type(` - updated`);
		cy.get('[data-name=e2e-demo-first-child] button').click({
			force: true,
		});
		cy.get('#children-picker')
			.type('e2e-demo-sec')
			.wait(500)
			.type('{downarrow}{enter}');
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', `${someString} - updated`);
		cy.get('#children>li')
			.eq(0)
			.should('have.text', `${code}-second-child`)
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-second-child`);
	});

	it('can edit other non minimum viable fields of a record', () => {
		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);

		visitEditPage();
		cy.get('textarea[name=anotherDocument]').type(anotherDocument);
		cy.get('[type="radio"]')
			.first()
			.check({ force: true });
		cy.get('select[name=someEnum]').select(someEnum);
		cy.get('#checkbox-someMultipleChoice-First').check({ force: true });
		cy.get('#checkbox-someMultipleChoice-Third').check({ force: true });
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);
		cy.get('#children>li')
			.eq(0)
			.should('have.text', `${code}-first-child`)
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);
		cy.get('#anotherDocument').should('have.text', anotherDocument);
		cy.get('#someBoolean').should('have.text', 'Yes');
		cy.get('#someEnum').should('have.text', someEnum);
		cy.get('#someMultipleChoice span:first-child').should(
			'have.text',
			'First',
		);
		cy.get('#someMultipleChoice span:last-child').should(
			'have.text',
			'Third',
		);
		cy.get('#someMultipleChoice')
			.children()
			.should('have.length', 2);

		visitEditPage();

		cy.get('textarea[name=anotherDocument]').type(` - updated`);
		cy.get('[type="radio"]')
			.eq(1)
			.check({ force: true });
		cy.get('select[name=someEnum]').select(`Third`);
		cy.get('#checkbox-someMultipleChoice-Third').uncheck({ force: true });
		cy.get('#checkbox-someMultipleChoice-Second').check({ force: true });
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);
		cy.get('#children>li')
			.eq(0)
			.should('have.text', `${code}-first-child`)
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);
		cy.get('#anotherDocument').should(
			'have.text',
			`${anotherDocument} - updated`,
		);
		cy.get('#someBoolean').should('have.text', 'No');
		cy.get('#someEnum').should('have.text', 'Third');
		cy.get('#someMultipleChoice span:first-child').should(
			'have.text',
			'First',
		);
		cy.get('#someMultipleChoice span:last-child').should(
			'have.text',
			'Second',
		);
		cy.get('#someMultipleChoice')
			.children()
			.should('have.length', 2);
	});
});
