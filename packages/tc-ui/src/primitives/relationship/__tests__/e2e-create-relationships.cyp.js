const { code } = require('../../../test-helpers/mainTypeData.json');
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
} = require('../../../test-helpers');

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

	describe('one-to-one relationship', () => {
		it('can select a selection for one-to-one relationship', () => {
			visitMainTypePage();
			visitEditPage();

			pickFavouriteChild();
			save();

			cy.url().should('contain', `/MainType/${code}`);
			cy.get('#favouriteChild')
				.should('have.text', `${code}-first-child`)
				.should('have.attr', 'href', `/ChildType/${code}-first-child`);
		});

		it('can not select another selection for one-to-one relationship', () => {
			visitMainTypePage();
			visitEditPage();

			pickFavouriteChild();
			cy.get('#ul-favouriteChild span').should(
				'have.text',
				'e2e-demo-first-child',
			);
			cy.get('#favouriteChild-picker').should('be.disabled');
			save();

			cy.url().should('contain', `/MainType/${code}`);
			cy.get('#favouriteChild')
				.should('have.text', `${code}-first-child`)
				.should('have.attr', 'href', `/ChildType/${code}-first-child`);
		});
	});

	describe('one-to-many relationship', () => {
		it('can create one-to-many relationship', () => {
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

		it('can select a selection for one-to-many relationship', () => {
			visitMainTypePage();

			visitEditPage();

			// pick second child
			pickChild();

			cy.get('#ul-children')
				.children()
				.then(children => {
					cy.wrap(children).should('have.length', 2);
					cy.wrap(children)
						.eq(0)
						.find('span')
						.should('have.text', 'e2e-demo-first-child');
					cy.wrap(children)
						.eq(1)
						.find('span')
						.should('have.text', 'e2e-demo-second-child');
				});

			save();

			cy.url().should('contain', `/MainType/${code}`);
			cy.get('#children>li').then(children => {
				cy.wrap(children)
					.eq(0)
					.should('have.text', `${code}-first-child`)
					.find('a')
					.should(
						'have.attr',
						'href',
						`/ChildType/${code}-first-child`,
					);
				cy.wrap(children)
					.eq(1)
					.should('have.text', `${code}-second-child`)
					.find('a')
					.should(
						'have.attr',
						'href',
						`/ChildType/${code}-second-child`,
					);
			});
		});

		it('can select another selection for one-to-many relationship', () => {
			visitMainTypePage();

			visitEditPage();

			// pick second child
			pickChild();
			cy.get('#children-picker').should('not.be.disabled');
		});
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

	it('fetches suggestions from the autocomplete api', () => {
		const selector = '[data-property-name="children"]';
		visitMainTypePage();
		visitEditPage();

		cy.get('#children-picker')
			.type('e2e')
			.get(`${selector} .react-autosuggest__suggestions-list`)
			.children()
			.should('have.length', 1)
			.first()
			.should('contain', 'e2e-demo-second-child');

		cy.get('#ul-children>li')
			.eq(0)
			.find('button')
			.should('have.text', 'Remove')
			.click();

		cy.get('#children-picker').clear();
		cy.get('#children-picker').type('e2e');

		cy.get(`${selector} .react-autosuggest__suggestions-list`)
			.children()
			.should('have.length', 2);
		cy.get(`${selector} li#react-autowhatever-1--item-0`).should(
			'contain',
			'e2e-demo-first-child',
		);
		cy.get(`${selector} li#react-autowhatever-1--item-1`).should(
			'contain',
			'e2e-demo-second-child',
		);
	});

	it('does not suggest previously selected records', () => {
		const selector = '[data-property-name="children"]';
		visitMainTypePage();
		visitEditPage();

		// e2e-demo-first-child is already selected
		cy.get('#children-picker')
			.type('e2e')
			.get(`${selector} .react-autosuggest__suggestions-list`)
			.children()
			.should('have.length', 1)
			.first()
			.should('contain', 'e2e-demo-second-child');
	});
});
