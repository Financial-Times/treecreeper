const { code } = require('../fixtures/mainTypeData.json');
const { populateChildTypeFields, save } = require('../test-helpers');
const { dropFixtures } = require('../../test-helpers/test-fixtures');

const resetDb = async () => {
	await dropFixtures(code);
};

describe('End-to-end journey for creating ChildType', () => {
	before(() => {
		resetDb();

		populateChildTypeFields(`${code}-child`);
		save();
	});

	it('Navigates through ChildType', () => {
		cy.visit(`/ChildType/${code}-child`);
		cy.url().should('contain', `/ChildType/${code}-child`);

		cy.get('#code').should('have.text', `${code}-child`);
	});
});
