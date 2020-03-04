const { code } = require('../../../test-helpers/mainTypeData.json');
const {
	populateMinimumViableFields,
	populateChildTypeFields,
	pickChild,
	pickFavouriteChild,
	visitEditPage,
	visitMainTypePage,
	save,
	resetDb,
} = require('../../../test-helpers/cypress');

describe('End-to-end - relationship deletion', () => {
	beforeEach(() => {
		cy.wrap(resetDb()).then(() => {
			populateMinimumViableFields(code);
			save();
			populateChildTypeFields(`${code}-first-child`);
			save();
			populateChildTypeFields(`${code}-second-child`);
			save();
		});
	});

	it('can remove 1-to-1 relationship', () => {
		visitMainTypePage();
		visitEditPage();

		pickFavouriteChild();
		save();

		cy.get('#favouriteChild')
			.should('have.text', `${code}-first-child`)
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);

		visitEditPage();

		cy.get('#ul-favouriteChild>li')
			.find('button.relationship-remove-button')
			.should('have.text', 'Remove')
			.click();
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#favouriteChild').should('not.exist');
	});

	it('can remove a relationship from 1-to-many relationship', () => {
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

		visitEditPage();
		cy.get('#ul-children>li')
			.eq(0)
			.find('button.relationship-remove-button')
			.should('have.text', 'Remove')
			.click();
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#children>li')
			.eq(0)
			.should('have.text', `${code}-second-child`)
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-second-child`);
	});

	it('can remove all relationships from 1-to-many relationship', () => {
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

		visitEditPage();
		// remove first child
		cy.get('#ul-children>li')
			.eq(0)
			.find('button.relationship-remove-button')
			.should('have.text', 'Remove')
			.click();
		// remove second child
		cy.get('#ul-children>li')
			.eq(0)
			.find('button.relationship-remove-button')
			.should('have.text', 'Remove')
			.click();
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#children').should('not.exist');
	});

	it('can remove both 1-to-1 and 1-to-many relationships', () => {
		visitMainTypePage();

		visitEditPage();

		// pick second child
		pickChild();
		pickFavouriteChild();
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#children')
			.children()
			.should('have.length', 2);
		cy.get('#children>li').then(children => {
			cy.wrap(children)
				.eq(0)
				.should('have.text', `${code}-first-child`)
				.find('a')
				.should('have.attr', 'href', `/ChildType/${code}-first-child`);
			cy.wrap(children)
				.eq(1)
				.should('have.text', `${code}-second-child`)
				.find('a')
				.should('have.attr', 'href', `/ChildType/${code}-second-child`);
		});

		cy.get('#favouriteChild')
			.should('have.text', `${code}-first-child`)
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);

		visitEditPage();
		// remove first child
		cy.get('#ul-children>li')
			.eq(0)
			.find('button.relationship-remove-button')
			.should('have.text', 'Remove')
			.click();
		save();
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
			.find('button.relationship-remove-button')
			.should('have.text', 'Remove')
			.click();
		cy.get('#ul-favouriteChild>li')
			.find('button.relationship-remove-button')
			.should('have.text', 'Remove')
			.click();
		save();
		cy.url().should('contain', `/MainType/${code}`);

		cy.get('#favouriteChild').should('not.exist');
		cy.get('#children').should('not.exist');
	});
});
