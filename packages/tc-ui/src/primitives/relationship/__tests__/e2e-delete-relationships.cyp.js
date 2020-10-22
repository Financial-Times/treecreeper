const { code } = require('../../../test-helpers/mainTypeData.json');
const {
	createType,
	createMainTypeRecordWithChild,
	pickChild,
	pickFavouriteChild,
	visitEditPage,
	visitMainTypePage,
	save,
} = require('../../../test-helpers/cypress');

describe('End-to-end - relationship deletion', () => {
	beforeEach(() => {
		const firstChild = `${code}-first-child`;
		const secondChild = `${code}-second-child`;
		const c = createType({ code: secondChild, type: 'ChildType' });
		const m = createMainTypeRecordWithChild(code, firstChild);
		cy.wrap(Promise.all([c, m])).then(() => {
			visitMainTypePage();
			visitEditPage();
		});
	});

	it('can remove 1-to-1 relationship', () => {
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

	it('can remove first relationship from 1-to-many relationship', () => {
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

	it('can remove nth relationship from 1-to-many relationship', () => {
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
			.eq(1)
			.find('button.relationship-remove-button')
			.should('have.text', 'Remove')
			.click();
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#children>li')
			.eq(0)
			.should('have.text', `${code}-first-child`)
			.find('a')
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);
	});

	it('can remove all relationships from 1-to-many relationship', () => {
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
