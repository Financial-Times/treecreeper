const {
	code,
	someDocument,
	anotherDocument,
	someString,
	someEnum,
	someInteger,
	anotherString,
	someUrl,
} = require('../fixtures/mainTypeData.json');
const { dropFixtures } = require('../../test-helpers/test-fixtures');
const {
	populateMainTypeFields,
	visitMainTypePage,
	save,
} = require('../test-helpers');

const resetDb = async () => {
	await dropFixtures(code);
};

describe('End-to-end Journey', () => {
	before(() => {
		resetDb();

		cy.visit(`/MainType/create`);
		cy.url().should('contain', '/MainType/create');

		populateMainTypeFields(code);
		save();
	});

	it('Navigates through MainType', () => {
		visitMainTypePage();

		cy.get('#code').should('have.text', code);
		cy.get('#someDocument').should('have.text', someDocument);
		cy.get('#anotherDocument').should('have.text', anotherDocument);
		cy.get('#someString').should('have.text', someString);
		cy.get('#someBoolean').should('have.text', 'Yes');
		cy.get('#someEnum').should('have.text', someEnum);
		cy.get('#someInteger').should('have.text', String(someInteger));
		cy.get('#anotherString').should('have.text', anotherString);
		cy.get('#someDate').should('have.text', '15 January 2020');
		cy.get('#someDatetime').should(
			'have.text',
			'15 January 2020, 1:00:00 PM',
		);
		cy.get('#someUrl').should('have.text', someUrl);
	});
});
