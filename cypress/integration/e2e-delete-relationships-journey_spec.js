const { code } = require('../fixtures/mainTypeData.json');
const {
	populateMainTypeFields,
	populateParentTypeFields,
	populateChildTypeFields,
	pickChild,
	pickFavouriteChild,
	visitEditPage,
	visitMainTypePage,
	save,
} = require('../test-helpers');
const { dropFixtures } = require('../../test-helpers/test-fixtures');

const resetDb = async () => {
	await dropFixtures(code);
};

describe('End-to-end journey for deleting relationships', () => {
	beforeEach(() => {
		resetDb();

		populateMainTypeFields(code);
		save();
		populateParentTypeFields(`${code}-parent`);
		save();
		populateChildTypeFields(`${code}-first-child`);
		save();
		populateChildTypeFields(`${code}-second-child`);
		save();
	});

	it('can remove 1-to-1 relationship', () => {
		visitMainTypePage();
		visitEditPage();

		pickFavouriteChild();
		save();

		visitMainTypePage();

		cy.get('#favouriteChild')
			.should('have.text', `${code}-first-child`)
			.url(`/ChildType/${code}-favourite-child`);

		visitEditPage();

		cy.get('#ul-favouriteChild>li')
			.find('button')
			.should('have.text', 'Remove')
			.click();

		save();

		cy.visit(`/MainType/${code}`);
		cy.url().should('contain', `/MainType/${code}`);

		cy.get('#favouriteChild').should('not.exist');
	});

	it('can remove a relationship from 1-to-many relationship', () => {
		visitMainTypePage();
		visitEditPage();
		// pick first child
		pickChild();
		// pick second child
		pickChild();

		save();

		visitMainTypePage();

		cy.get('#children>li')
			.eq(0)
			.should('have.text', `${code}-first-child`)
			.url(`/ChildType/${code}-first-child`);

		cy.get('#children>li')
			.eq(1)
			.should('have.text', `${code}-second-child`)
			.url(`/ChildType/${code}-second-child`);

		visitEditPage();
		cy.get('#ul-children>li')
			.eq(0)
			.find('button')
			.should('have.text', 'Remove')
			.click();
		save();

		visitMainTypePage();

		cy.get('#children>li')
			.eq(0)
			.should('have.text', `${code}-second-child`)
			.url(`/ChildType/${code}-second-child`);
	});

	it('can remove all relationships from 1-to-many relationship', () => {
		visitMainTypePage();
		visitEditPage();
		// pick first child
		pickChild();
		// pick second child
		pickChild();

		save();

		visitMainTypePage();

		cy.get('#children>li')
			.eq(0)
			.should('have.text', `${code}-first-child`)
			.url(`/ChildType/${code}-first-child`);

		cy.get('#children>li')
			.eq(1)
			.should('have.text', `${code}-second-child`)
			.url(`/ChildType/${code}-second-child`);

		visitEditPage();
		// remove first child
		cy.get('#ul-children>li')
			.eq(0)
			.find('button')
			.should('have.text', 'Remove')
			.click();
		// remove second child
		cy.get('#ul-children>li')
			.eq(0)
			.find('button')
			.should('have.text', 'Remove')
			.click();
		save();

		visitMainTypePage();

		cy.get('#children').should('not.exist');
	});
});
