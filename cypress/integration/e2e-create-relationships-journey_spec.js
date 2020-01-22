const { code } = require('../fixtures/mainTypeData.json');
const {
	populateMainTypeFields,
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

		populateMainTypeFields(code);
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
			.url(`/ParentType/${code}-parent`);
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
			.url(`/ChildType/${code}-first-child`);

		cy.get('#children>li')
			.eq(1)
			.should('have.text', `${code}-second-child`)
			.url(`/ChildType/${code}-second-child`);
	});

	it('can create 1-to-1 relationship', () => {
		visitMainTypePage();
		visitEditPage();

		pickFavouriteChild();
		save();

		visitMainTypePage();

		cy.get('#favouriteChild')
			.should('have.text', `${code}-first-child`)
			.url(`/ChildType/${code}-favourite-child`);
	});
});
