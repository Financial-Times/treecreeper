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
		visitMainTypePage();
		visitEditPage();
	});

	describe('one-to-one relationship', () => {
		const placeholderText =
			'Click "Remove" to replace the existing unique relationship';

		it('can select a selection', () => {
			visitMainTypePage();
			visitEditPage();

			pickFavouriteChild();
			save();

			cy.url().should('contain', `/MainType/${code}`);
			cy.get('#favouriteChild')
				.should('have.text', `${code}-first-child`)
				.should('have.attr', 'href', `/ChildType/${code}-first-child`);
		});

		it('disables selection on page load if there is a selection already', () => {
			visitMainTypePage();
			visitEditPage();

			pickFavouriteChild();
			cy.get(
				'#ul-favouriteChild li:first-of-type span.o-layout-typography',
			).should('have.text', 'e2e-demo-first-child');
			cy.get('#favouriteChild-picker')
				.should('be.disabled')
				.should('have.attr', 'placeholder', placeholderText);
			save();

			cy.url().should('contain', `/MainType/${code}`);
			cy.get('#favouriteChild')
				.should('have.text', `${code}-first-child`)
				.should('have.attr', 'href', `/ChildType/${code}-first-child`);

			visitEditPage();
			cy.get('#favouriteChild-picker')
				.should('be.disabled')
				.should('have.attr', 'placeholder', placeholderText);
		});

		it('can not select another selection', () => {
			visitMainTypePage();
			visitEditPage();

			pickFavouriteChild();
			cy.get(
				'#ul-favouriteChild li:first-of-type span.o-layout-typography',
			).should('have.text', 'e2e-demo-first-child');
			cy.get('#favouriteChild-picker')
				.should('be.disabled')
				.should('have.attr', 'placeholder', placeholderText);
			save();

			cy.url().should('contain', `/MainType/${code}`);
			cy.get('#favouriteChild')
				.should('have.text', `${code}-first-child`)
				.should('have.attr', 'href', `/ChildType/${code}-first-child`);
		});

		it('can select another selection on removing the existing one', () => {
			visitMainTypePage();
			visitEditPage();

			pickFavouriteChild();
			cy.get(
				'#ul-favouriteChild li:first-of-type span.o-layout-typography',
			).should('have.text', 'e2e-demo-first-child');
			cy.get('#favouriteChild-picker')
				.should('be.disabled')
				.should('have.attr', 'placeholder', placeholderText);
			cy.get('#ul-favouriteChild li')
				.find('button.relationship-remove-button')
				.click();
			cy.get('#favouriteChild-picker')
				.should('not.be.disabled')
				.should('have.attr', 'placeholder', '');
			pickFavouriteChild(`${code}-second`);
			save();

			cy.url().should('contain', `/MainType/${code}`);
			cy.get('#favouriteChild')
				.should('have.text', `${code}-second-child`)
				.should('have.attr', 'href', `/ChildType/${code}-second-child`);
		});
	});

	describe('one-to-many relationship', () => {
		it('can create', () => {
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

		it('does not disable selection on page load if there is a selection already', () => {
			// e2e-demo-first-child is already picked during populateMinimumViableFields();
			cy.get(
				'#ul-children li:first-of-type span.o-layout-typography',
			).should('have.text', 'e2e-demo-first-child');
			cy.get('#children-picker')
				.should('not.be.disabled')
				.should('have.attr', 'placeholder', '');
			save();
		});

		it('does not disable if there is a selection already', () => {
			// pick second child
			pickChild();
			cy.get('#children-picker').should('not.be.disabled');
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

			visitMainTypePage();
			cy.get('#children-picker').should('not.be.disabled');
		});

		it('can select multiple selections', () => {
			// pick second child
			pickChild();

			cy.get('#ul-children')
				.children()
				.then(children => {
					cy.wrap(children).should('have.length', 2);
					cy.wrap(children)
						.eq(0)
						.find('span.o-layout-typography')
						.should('have.text', 'e2e-demo-first-child');
					cy.wrap(children)
						.eq(1)
						.find('span.o-layout-typography')
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
	});

	it('can create main -> parent relationship', () => {
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

		cy.get('#children-picker')
			.type('e2e')
			.get(`${selector} .react-autosuggest__suggestions-list`)
			.children()
			.should('have.length', 1)
			.first()
			.should('contain', 'e2e-demo-second-child');

		cy.get('#children-picker').clear();

		cy.get('#ul-children>li')
			.eq(0)
			.find('button.relationship-remove-button')
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
