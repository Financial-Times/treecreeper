const {
	code,
} = require('../../../../../../cypress/fixtures/mainTypeData.json');
const {
	populateMinimumViableFields,
	populateParentTypeFields,
	populateChildTypeFields,
	pickChild,
	pickParent,
	pickFavouriteChild,
	visitEditPage,
	visitMainTypePage,
	save,
	resetDb,
} = require('../../../../../../cypress/test-helpers');

describe('End-to-end - relationship creation', () => {
	beforeEach(() => {
		resetDb();
		populateMinimumViableFields(code);
		save();
		populateParentTypeFields(`${code}-parent`);
		save();
		populateChildTypeFields(`${code}-second-child`);
		save();
	});

	it('can create main -> parent relationship', () => {
		visitMainTypePage();
		visitEditPage();

		pickParent();
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#parents')
			.find('a')
			.should('have.text', `${code}-parent`)
			.should('have.attr', 'href', `/ParentType/${code}-parent`);
	});

	it('can create 1-to-many relationship', () => {
		visitMainTypePage();

		visitEditPage();

		// pick second child
		pickChild();
		save();

		cy.url().should('contain', `/MainType/${code}`);
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

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#favouriteChild')
			.should('have.text', `${code}-first-child`)
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);
	});

	it('can create both 1-to-1 and 1-to-many relationships', () => {
		visitMainTypePage();

		visitEditPage();

		// pick second child
		pickChild();
		pickFavouriteChild();
		save();

		cy.url().should('contain', `/MainType/${code}`);
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
