const { code } = require('../fixtures/mainTypeData.json');
const {
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

		cy.visit(`/MainType/create`);
		cy.get('input[name=code]').type(code);
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
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);

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
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);

		cy.get('#children>li')
			.eq(1)
			.should('have.text', `${code}-second-child`)
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-second-child`);

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
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-second-child`);
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
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);

		cy.get('#children>li')
			.eq(1)
			.should('have.text', `${code}-second-child`)
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-second-child`);

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

	it('can remove both 1-to-1 and 1-to-many relationships', () => {
		visitMainTypePage();

		visitEditPage();

		// pick first child
		pickChild();
		// pick second child
		pickChild();
		pickFavouriteChild();
		save();

		visitMainTypePage();

		cy.get('#children')
			.children()
			.should('have.length', 2);
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

		visitEditPage();
		// remove first child
		cy.get('#ul-children>li')
			.eq(0)
			.find('button')
			.should('have.text', 'Remove')
			.click();
		save();

		cy.visit(`/MainType/${code}`);
		cy.url().should('contain', `/MainType/${code}`);

		cy.get('#favouriteChild')
			.should('have.text', `${code}-first-child`)
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);

		cy.get('#children')
			.children()
			.should('have.length', 1);

		visitEditPage();
		// remove remaining child
		cy.get('#ul-children>li')
			.eq(0)
			.find('button')
			.should('have.text', 'Remove')
			.click();
		cy.get('#ul-favouriteChild>li')
			.find('button')
			.should('have.text', 'Remove')
			.click();
		save();
		cy.visit(`/MainType/${code}`);
		cy.url().should('contain', `/MainType/${code}`);

		cy.get('#favouriteChild').should('not.exist');
		cy.get('#children').should('not.exist');
	});
});
