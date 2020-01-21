const { code } = require('../fixtures/mainTypeData.json');
const { populateParentTypeFields, save } = require('../test-helpers');
const { dropFixtures } = require('../../test-helpers/test-fixtures');

const resetDb = async () => {
	await dropFixtures(code);
};

describe('End-to-end journey for creating ParentType', () => {
	before(() => {
		resetDb();

		populateParentTypeFields(`${code}-parent`);
		save();
	});

	it('Navigates through ParentType', () => {
		cy.visit(`/ParentType/${code}-parent`);
		cy.url().should('contain', `/ParentType/${code}-parent`);

		cy.get('#code').should('have.text', `${code}-parent`);
	});
});
