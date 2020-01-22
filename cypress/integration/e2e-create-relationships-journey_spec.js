const { code } = require('../fixtures/mainTypeData.json');
const {
	populateParentTypeFields,
	populateChildTypeFields,
	pickChild,
	pickParent,
	pickFavouriteChild,
	visitEditPage,
	visitMainTypePage,
	save,
} = require('../test-helpers');
const { dropFixtures } = require('../../test-helpers/test-fixtures');

const resetDb = async () => {
	await dropFixtures(code);
};

describe('End-to-end journey for creating relationships', () => {
	beforeEach(() => {
		resetDb();

		cy.visit(`/MainType/create`);
		cy.get('input[name=code]').type(code);
		save();
		populateParentTypeFields(`${code}-parent`);
		save();
		populateChildTypeFields(`${code}-first-child`);
		save();
		populateChildTypeFields(`${code}-second-child`);
		save();
	});

	it('can create main -> parent relationship', () => {
		visitMainTypePage();
		visitEditPage();

		pickParent();
		save();

		visitMainTypePage();

		cy.get('#parents')
			.find('a')
			.should('have.text', `${code}-parent`)
			.should('have.attr', 'href', `/ParentType/${code}-parent`);
	});

	it('can create 1-to-many relationship', () => {
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
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);

		cy.get('#children>li')
			.eq(1)
			.should('have.text', `${code}-second-child`)
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-second-child`);
	});

	it('can create 1-to-1 relationship', () => {
		visitMainTypePage();
		visitEditPage();

		pickFavouriteChild();
		save();

		visitMainTypePage();

		cy.get('#favouriteChild')
			.should('have.text', `${code}-first-child`)
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);
	});

	it('can create both 1-to-1 and 1-to-many relationships', () => {
		visitMainTypePage();

		visitEditPage();

		// pick first child
		pickChild();
		// pick second child
		pickChild();
		pickFavouriteChild();
		save();

		visitMainTypePage();

		cy.get('#children>li')
			.eq(0)
			.should('have.text', `${code}-first-child`)
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);

		cy.get('#children>li')
			.eq(1)
			.should('have.text', `${code}-second-child`)
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-second-child`);

		cy.get('#favouriteChild')
			.should('have.text', `${code}-first-child`)
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);
	});
});
