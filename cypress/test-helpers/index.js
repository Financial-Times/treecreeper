const {
	code,
	someDocument,
	anotherDocument,
	someString,
	someEnum,
	someInteger,
	anotherString,
	someDate,
	someDatetime,
	someUrl,
} = require('../fixtures/mainTypeData.json');
const { dropFixtures } = require('../../test-helpers/test-fixtures');

const populateParentTypeFields = codeLabel => {
	cy.visit(`/ParentType/create`);
	cy.url().should('contain', '/ParentType/create');

	cy.get('#id-code').type(codeLabel);
};

const populateChildTypeFields = async codeLabel => {
	cy.visit(`/ChildType/create`);
	cy.url().should('contain', '/ChildType/create');

	cy.get('#id-code').type(codeLabel);
};

const pickChild = () => {
	cy.get('#children-picker')
		.type('e2e')
		.wait(500)
		.type('{downarrow}{enter}')
		.should('not.be.disabled');
};

const pickFavouriteChild = () => {
	cy.get('#favouriteChild-picker')
		.type('e2e-demo-fir')
		.wait(500)
		.type('{downarrow}{enter}')
		.should('be.disabled');
};

const visitEditPage = () => {
	cy.get('[data-button-type="edit"]').click();
	cy.url().should('contain', `/MainType/${code}/edit`);
};

const visitMainTypePage = () => {
	cy.visit(`/MainType/${code}`);
	cy.url().should('contain', `/MainType/${code}`);
};

const save = () => {
	cy.get('[data-button-type="submit"]').click();
};

const pickParent = () => {
	cy.get('#parents-picker')
		.type('e2e')
		.wait(500)
		.type('{downarrow}{enter}');
};

const populateMinimumViableFields = codeLabel => {
	// create child record
	populateChildTypeFields(`${codeLabel}-first-child`);
	save();
	// create main record
	cy.visit(`/MainType/create`);
	cy.get('input[name=code]').type(codeLabel);
	cy.get('input[name=someString]').type(someString);
	pickChild();
};

const populateNonMinimumViableFields = () => {
	visitEditPage();

	cy.get('textarea[name=someDocument]').type(someDocument);
	cy.get('textarea[name=anotherDocument]').type(anotherDocument);
	cy.get('[type="radio"]')
		.first()
		.check({ force: true });
	cy.get('select[name=someEnum]').select(someEnum);
	cy.get('#checkbox-someMultipleChoice-First').check({ force: true });
	cy.get('#checkbox-someMultipleChoice-Third').check({ force: true });
	cy.get('#checkbox-someMultipleChoice-First')
		.should('have.value', 'First')
		.should('be.checked');
	cy.get('#checkbox-someMultipleChoice-Second')
		.should('have.value', 'Second')
		.should('not.be.checked');
	cy.get('#checkbox-someMultipleChoice-Third')
		.should('have.value', 'Third')
		.should('be.checked');
	cy.get('input[name=someInteger]').type(someInteger);
	cy.get('input[name=anotherString]').type(anotherString);
	cy.get('input[name=someDate]')
		.click()
		.then(input => {
			input[0].dispatchEvent(new Event('input', { bubbles: true }));
			input.val(someDate);
		})
		.click();
	cy.get('input[name=someDatetime]')
		.click()
		.then(input => {
			input[0].dispatchEvent(new Event('input', { bubbles: true }));
			input.val(someDatetime);
		})
		.click();

	cy.get('input[name=someUrl]').type(someUrl);
};

const resetDb = async () => {
	await dropFixtures(code);
};

module.exports = {
	populateNonMinimumViableFields,
	populateParentTypeFields,
	populateChildTypeFields,
	pickChild,
	pickParent,
	pickFavouriteChild,
	visitEditPage,
	visitMainTypePage,
	save,
	populateMinimumViableFields,
	resetDb,
};
