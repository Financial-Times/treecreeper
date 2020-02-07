const { code } = require('../../../test-helpers/mainTypeData.json');
const {
	populateMinimumViableFields,
	populateParentTypeFields,
	populateChildTypeFields,
	pickCuriousChild,
	pickCuriousParent,
	visitEditPage,
	visitMainTypePage,
	save,
	resetDb,
	setPropsOnCuriousChildRel,
	setPropsOnCuriousParentRel,
} = require('../../../test-helpers');

describe('End-to-end - display relationship properties', () => {
	beforeEach(() => {
		resetDb();
		populateMinimumViableFields(code);
		save();
		populateParentTypeFields(`${code}-first-parent`);
		save();
		populateParentTypeFields(`${code}-second-parent`);
		save();
		populateChildTypeFields(`${code}-second-child`);
		save();
		visitMainTypePage();
	});

	it('can display/hide relationship properties', () => {
		visitEditPage();
		pickCuriousChild();
		save();

		cy.wrap().then(() => setPropsOnCuriousChildRel(`${code}-first-child`));
		// to refresh the page after updating neo4j
		visitMainTypePage();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#curiousChild')
			.should('have.text', `${code}-first-child`)
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);

		cy.get('#curiousChild')
			.parent()
			.find('[data-o-component="o-expander"] .o-expander__content')
			.should('not.be.visible');

		cy.get('[aria-controls="o-expander__toggle--1"]')
			.should('have.text', 'more info')
			.click();

		cy.get('#curiousChild')
			.parent()
			.then(parent => {
				cy.wrap(parent)
					.find(
						'[data-o-component="o-expander"] .o-expander__content',
					)
					.should('be.visible');
				cy.wrap(parent)
					.find('.biz-ops-relationship-props-list #someEnum')
					.should('have.text', 'First');
				cy.wrap(parent)
					.find(
						'.biz-ops-relationship-props-list #someMultipleChoice span:first-of-type',
					)
					.should('have.text', 'First');
				cy.wrap(parent)
					.find(
						'.biz-ops-relationship-props-list #someMultipleChoice span:last-of-type',
					)
					.should('have.text', 'Third');
			});

		cy.get('[aria-controls="o-expander__toggle--1"]')
			.should('have.text', 'less')
			.click();

		cy.get('#curiousChild')
			.parent()
			.then(child => {
				cy.wrap(child)
					.find(
						'[data-o-component="o-expander"] .o-expander__content',
					)
					.should('not.be.visible');
				cy.wrap(child)
					.find('.biz-ops-relationship-props-list #someEnum')
					.should('not.be.visible');
			});
	});

	it('can display properties on a 1-to-1 relationship', () => {
		visitEditPage();
		pickCuriousChild();
		save();

		cy.wrap().then(() => setPropsOnCuriousChildRel(`${code}-first-child`));
		// to refresh the page after updating neo4j
		visitMainTypePage();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#curiousChild')
			.should('have.text', `${code}-first-child`)
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);
		cy.get('#curiousChild')
			.parent()
			.get('.biz-ops-relationship-props-list')
			.then(list => {
				cy.wrap(list)
					.find('#someString')
					.should('have.text', 'lorem ipsum');
				cy.wrap(list)
					.find('#someEnum')
					.should('have.text', 'First');
				cy.wrap(list)
					.find('#someBoolean')
					.should('have.text', 'Yes');
			});
	});

	it('can display properties on a 1-to-m relationship', () => {
		visitEditPage();
		pickCuriousParent();
		pickCuriousParent();
		save();

		cy.wrap().then(() =>
			setPropsOnCuriousParentRel(`${code}-first-parent`),
		);
		// to refresh the page after updating neo4j
		visitMainTypePage();

		cy.url().should('contain', `/MainType/${code}`);
		const firstCuriousParentSelector = 'ul#curiousParent li:first-child';
		const secondCuriousParentSelector = 'ul#curiousParent li:last-of-type';

		cy.get(`${firstCuriousParentSelector} a`)
			.should('have.text', `${code}-first-parent`)
			.should('have.attr', 'href', `/ParentType/${code}-first-parent`);
		cy.get(`${firstCuriousParentSelector}`).then(parent => {
			cy.wrap(parent)
				.find('#someString')
				.should('have.text', 'lorem ipsum');
			cy.wrap(parent)
				.find('#anotherString')
				.should('have.text', 'another lorem ipsum');
		});

		cy.get(`${secondCuriousParentSelector} a`)
			.should('have.text', `${code}-second-parent`)
			.should('have.attr', 'href', `/ParentType/${code}-second-parent`);
		cy.get(`${secondCuriousParentSelector}`).then(parent => {
			cy.wrap(parent)
				.find('#someString')
				.should('not.exist');
			cy.wrap(parent)
				.find('#anotherString')
				.should('not.exist');
		});
	});

	it('can display properties on each relationship in a 1-to-m relationship', () => {
		visitEditPage();
		pickCuriousParent();
		pickCuriousParent();
		save();

		cy.wrap().then(() =>
			setPropsOnCuriousParentRel(`${code}-first-parent`),
		);
		cy.wrap().then(() =>
			setPropsOnCuriousParentRel(`${code}-second-parent`),
		);
		// to refresh the page after updating neo4j
		visitMainTypePage();

		cy.url().should('contain', `/MainType/${code}`);
		const firstCuriousParentSelector = 'ul#curiousParent li:first-child';
		const secondCuriousParentSelector = 'ul#curiousParent li:last-of-type';

		cy.get(`${firstCuriousParentSelector} a`)
			.should('have.text', `${code}-first-parent`)
			.should('have.attr', 'href', `/ParentType/${code}-first-parent`);

		cy.get(`${firstCuriousParentSelector}`).then(parent => {
			cy.wrap(parent)
				.find('#someString')
				.should('have.text', 'lorem ipsum');
			cy.wrap(parent)
				.find('#anotherString')
				.should('have.text', 'another lorem ipsum');
		});

		cy.get(`${secondCuriousParentSelector} a`)
			.should('have.text', `${code}-second-parent`)
			.should('have.attr', 'href', `/ParentType/${code}-second-parent`);
		cy.get(`${secondCuriousParentSelector}`).then(parent => {
			cy.wrap(parent)
				.find('#someString')
				.should('have.text', 'lorem ipsum');
			cy.wrap(parent)
				.find('#anotherString')
				.should('have.text', 'another lorem ipsum');
		});
	});
});
