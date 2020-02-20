const { code } = require('../../../test-helpers/mainTypeData.json');
const {
	populateMinimumViableFields,
	populateParentTypeFields,
	pickCuriousChild,
	pickCuriousParent,
	visitEditPage,
	visitMainTypePage,
	save,
	resetDb,
	setPropsOnCuriousParentRel,
	setPropsOnCuriousChildRel,
} = require('../../../test-helpers/cypress');

describe('End-to-end - edit relationship properties', () => {
	beforeEach(() => {
		resetDb();
		populateMinimumViableFields(code);
		save();
		populateParentTypeFields(`${code}-parent-one`);
		save();
		populateParentTypeFields(`${code}-parent-two`);
		save();
		visitMainTypePage();
	});

	it('does not render fields on page load', () => {
		visitEditPage();
		pickCuriousChild();
		save();

		cy.wrap().then(() => setPropsOnCuriousChildRel(`${code}-first-child`));
		visitMainTypePage();
		visitEditPage();

		cy.get('#ul-curiousChild .biz-ops-relationship-annotate').should(
			'not.exist',
		);
	});

	it('renders fields when Annotate button is clicked', () => {
		visitEditPage();
		pickCuriousChild();
		save();

		cy.wrap().then(() => setPropsOnCuriousChildRel(`${code}-first-child`));
		visitMainTypePage();
		visitEditPage();

		cy.get('#ul-curiousChild li')
			.find('button.relationship-annotate-button')
			.click();

		cy.get('#ul-curiousChild span.biz-ops-relationship-annotate').should(
			'be.visible',
		);
	});

	it('hides fields when Annotate button is clicked, if they are visible', () => {
		visitEditPage();
		pickCuriousChild();
		save();

		cy.wrap().then(() => setPropsOnCuriousChildRel(`${code}-first-child`));
		visitMainTypePage();
		visitEditPage();

		cy.get('#ul-curiousChild li')
			.find('button.relationship-annotate-button')
			.click();

		cy.get('#ul-curiousChild span.biz-ops-relationship-annotate').should(
			'be.visible',
		);

		cy.get('#ul-curiousChild li')
			.find('button.relationship-annotate-button')
			.click();

		cy.get('#ul-curiousChild .biz-ops-relationship-annotate').should(
			'not.exist',
		);
	});

	it('displays all fields defined for that relationship property', () => {
		visitEditPage();
		pickCuriousParent();
		pickCuriousChild();
		save();

		cy.wrap().then(() => setPropsOnCuriousParentRel(`${code}-parent-one`));
		cy.wrap().then(() => setPropsOnCuriousChildRel(`${code}-first-child`));
		visitEditPage();

		cy.get('#ul-curiousChild li')
			.find('button.relationship-annotate-button')
			.click();

		cy.get('#ul-curiousChild span.biz-ops-relationship-annotate').should(
			'be.visible',
		);

		cy.get('#ul-curiousChild .biz-ops-relationship-annotate').then(
			parent => {
				cy.wrap(parent)
					.find('#id-someString')
					.should('be.visible');
				cy.wrap(parent)
					.find('#id-anotherString')
					.should('be.visible');
				cy.wrap(parent)
					.find('#id-someString')
					.should('be.visible');
				cy.wrap(parent)
					.find('#id-someInteger')
					.should('be.visible');
				cy.wrap(parent)
					.find('#id-someEnum')
					.should('be.visible');
				cy.wrap(parent)
					.find('#checkbox-someMultipleChoice-First')
					.should('be.visible');
				cy.wrap(parent)
					.find('#checkbox-someMultipleChoice-Second')
					.should('be.visible');
				cy.wrap(parent)
					.find('#checkbox-someMultipleChoice-Third')
					.should('be.visible');
				cy.wrap(parent)
					.find('#radio-someBoolean-Yes')
					.should('be.visible');
				cy.wrap(parent)
					.find('#radio-someBoolean-No')
					.should('be.visible');
				cy.wrap(parent)
					.find('#id-someFloat')
					.should('be.visible');
			},
		);

		cy.get('#ul-curiousParent li')
			.find('button.relationship-annotate-button')
			.click();

		cy.get('#ul-curiousParent .biz-ops-relationship-annotate').should(
			'be.visible',
		);

		cy.get('#ul-curiousParent .biz-ops-relationship-annotate').then(
			parent => {
				cy.wrap(parent)
					.find('#id-someString')
					.should('be.visible');
				cy.wrap(parent)
					.find('#id-anotherString')
					.should('be.visible');
			},
		);
	});

	it('displays values of fields', () => {
		visitEditPage();
		pickCuriousParent();
		pickCuriousChild();
		save();

		cy.wrap().then(() => setPropsOnCuriousParentRel(`${code}-parent-one`));
		cy.wrap().then(() => setPropsOnCuriousChildRel(`${code}-first-child`));
		visitEditPage();

		cy.get('#ul-curiousChild li')
			.find('button.relationship-annotate-button')
			.click();

		cy.get('#ul-curiousChild span.biz-ops-relationship-annotate').should(
			'be.visible',
		);

		cy.get('#ul-curiousChild .biz-ops-relationship-annotate').then(
			parent => {
				cy.wrap(parent)
					.find('#id-someString')
					.should('have.value', 'lorem ipsum');
				cy.wrap(parent)
					.find('#id-anotherString')
					.should('have.value', 'another lorem ipsum');
				cy.wrap(parent)
					.find('#id-someInteger')
					.should('have.value', '2020');
				cy.wrap(parent)
					.find('#id-someEnum')
					.children()
					.eq(1)
					.should('have.value', 'First')
					.should('be.selected');
				cy.wrap(parent)
					.find('#checkbox-someMultipleChoice-First')
					.should('be.checked');
				cy.wrap(parent)
					.find('#checkbox-someMultipleChoice-Third')
					.should('be.checked');
				cy.wrap(parent)
					.find('#radio-someBoolean-Yes')
					.should('be.checked');
				cy.wrap(parent)
					.find('#id-someFloat')
					.should('have.value', '12.53');
			},
		);

		cy.get('#ul-curiousParent li')
			.find('button.relationship-annotate-button')
			.click();

		cy.get('#ul-curiousParent .biz-ops-relationship-annotate').should(
			'be.visible',
		);

		cy.get('#ul-curiousParent .biz-ops-relationship-annotate').then(
			parent => {
				cy.wrap(parent)
					.find('#id-someString')
					.should('have.value', 'parent lorem ipsum');
				cy.wrap(parent)
					.find('#id-anotherString')
					.should('have.value', 'parent another lorem ipsum');
			},
		);
	});
});
