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
		cy.wrap(resetDb()).then(() => {
			populateMinimumViableFields(code);
			save();
			populateParentTypeFields(`${code}-parent-one`);
			save();
			populateParentTypeFields(`${code}-parent-two`);
			save();
			visitMainTypePage();
		});
	});

	it('does not render annotation fields on page load for existing relationships', () => {
		visitEditPage();
		pickCuriousChild();
		save();

		cy.wrap().then(() => setPropsOnCuriousChildRel(`${code}-first-child`));
		visitMainTypePage();
		visitEditPage();

		cy.get('#ul-curiousChild .treecreeper-relationship-annotate').should(
			'not.exist',
		);
	});

	it('shows fields when the annotation button is clicked', () => {
		visitEditPage();
		pickCuriousChild();
		save();

		cy.wrap().then(() => setPropsOnCuriousChildRel(`${code}-first-child`));
		visitMainTypePage();
		visitEditPage();

		cy.get('#ul-curiousChild li')
			.find('button.relationship-annotate-button')
			.click({ force: true });

		cy.get(
			'#ul-curiousChild span.treecreeper-relationship-annotate',
		).should('be.visible');
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
			.click({ force: true });

		cy.get(
			'#ul-curiousChild span.treecreeper-relationship-annotate',
		).should('be.visible');

		cy.get('#ul-curiousChild .treecreeper-relationship-annotate').then(
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
			.click({ force: true });

		cy.get('#ul-curiousParent .treecreeper-relationship-annotate').should(
			'be.visible',
		);

		cy.get('#ul-curiousParent .treecreeper-relationship-annotate').then(
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

	it('can edit values one-to-one relationship annotations', () => {
		visitEditPage();
		pickCuriousChild();
		save();

		cy.wrap().then(() => setPropsOnCuriousChildRel(`${code}-first-child`));
		visitEditPage();

		cy.get('#ul-curiousChild li')
			.find('button.relationship-annotate-button')
			.should('have.text', 'Edit details')
			.click({ force: true });

		cy.get(
			'#ul-curiousChild span.treecreeper-relationship-annotate',
		).should('be.visible');

		cy.get('#ul-curiousChild .treecreeper-relationship-annotate').then(
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

				cy.wrap(parent)
					.find('#id-someString')
					.type(' edited');
				cy.wrap(parent)
					.find('#id-anotherString')
					.type(' edited');
				cy.wrap(parent)
					.find('#id-someInteger')
					.clear()
					.type(2023);
				cy.wrap(parent)
					.find('#id-someEnum')
					.select('Third');

				cy.wrap(parent)
					.find('#checkbox-someMultipleChoice-First')
					.uncheck({ force: true });
				cy.wrap(parent)
					.find('#checkbox-someMultipleChoice-Third')
					.uncheck({
						force: true,
					});
				cy.wrap(parent)
					.find('#checkbox-someMultipleChoice-Second')
					.check({ force: true });

				cy.wrap(parent)
					.find('#radio-someBoolean-No')
					.check({ force: true });
				cy.wrap(parent)
					.find('#id-someFloat')
					.clear()
					.type(20.23);
			},
		);
		save();

		cy.get('#curiousChild')
			.parent()
			.find('[data-o-component="o-expander"] button.o-expander__toggle')
			.click({ force: true });

		cy.get('#curiousChild')
			.parent()
			.then(parent => {
				cy.wrap(parent)
					.find('#someString')
					.should('have.text', `lorem ipsum edited`);
				cy.wrap(parent)
					.find('#anotherString')
					.should('have.text', `another lorem ipsum edited`);
				cy.wrap(parent)
					.find('#someInteger')
					.should('have.text', '2023');
				cy.wrap(parent)
					.find('#someEnum')
					.should('have.text', 'Third');
				cy.wrap(parent)
					.find('#someMultipleChoice span:first-of-type')
					.should('have.text', 'Second');
				cy.wrap(parent)
					.find('#someBoolean')
					.should('have.text', 'No');
				cy.wrap(parent)
					.find('#someFloat')
					.should('have.text', '20.23');
			});
	});

	it('can edit values one-to-many relationship annotations', () => {
		visitEditPage();
		pickCuriousParent();
		pickCuriousParent();
		save();

		cy.wrap().then(() => setPropsOnCuriousParentRel(`${code}-parent-one`));
		visitEditPage();

		cy.get('#ul-curiousParent')
			.children()
			.first()
			.then(child => {
				cy.wrap(child)
					.find('button.relationship-annotate-button')
					.should('have.text', 'Edit details')
					.click({ force: true });
				cy.wrap(child)
					.find('#id-someString')
					.should('have.value', 'parent lorem ipsum')
					.type(' edited parent one');
				cy.wrap(child)
					.find('#id-anotherString')
					.should('have.value', 'parent another lorem ipsum')
					.type(' edited parent one');
			});

		cy.get('#ul-curiousParent')
			.children()
			.eq(1)
			.then(child => {
				cy.wrap(child)
					.find('button.relationship-annotate-button')
					.should('have.text', 'Add details');
			});
		save();
		cy.wrap().then(() => setPropsOnCuriousParentRel(`${code}-parent-two`));
		visitEditPage();

		cy.get('#ul-curiousParent')
			.children()
			.eq(1)
			.then(child => {
				cy.wrap(child)
					.find('button.relationship-annotate-button')
					.click({ force: true });
				cy.wrap(child)
					.find('#id-someString')
					.should('have.value', 'parent lorem ipsum')
					.type(' edited parent two');
				cy.wrap(child)
					.find('#id-anotherString')
					.should('have.value', 'parent another lorem ipsum')
					.type(' edited parent two');
			});

		save();

		cy.get('#curiousParent')
			.children()
			.first()
			.then(child => {
				cy.wrap(child)
					.find(
						'[data-o-component="o-expander"] button.o-expander__toggle',
					)
					.click({ force: true });
				cy.wrap(child)
					.find('#someString')
					.should(
						'have.text',
						'parent lorem ipsum edited parent one',
					);
				cy.wrap(child)
					.find('#anotherString')
					.should(
						'have.text',
						'parent another lorem ipsum edited parent one',
					);
			});

		cy.get('#curiousParent')
			.children()
			.eq(1)
			.then(child => {
				cy.wrap(child)
					.find(
						'[data-o-component="o-expander"] button.o-expander__toggle',
					)
					.click({ force: true });
				cy.wrap(child)
					.find('#someString')
					.should(
						'have.text',
						'parent lorem ipsum edited parent two',
					);
				cy.wrap(child)
					.find('#anotherString')
					.should(
						'have.text',
						'parent another lorem ipsum edited parent two',
					);
			});
	});

	it('restores in-progress edits to the relationship annotations if the form is submitted but errors', () => {
		visitEditPage();
		pickCuriousChild();
		save();

		cy.wrap().then(() => setPropsOnCuriousChildRel(`${code}-first-child`));
		visitEditPage();

		cy.get('#ul-curiousChild li')
			.find('button.relationship-annotate-button')
			.should('have.text', 'Edit details')
			.click({ force: true });

		cy.get(
			'#ul-curiousChild span.treecreeper-relationship-annotate',
		).should('be.visible');

		cy.get('#ul-curiousChild .treecreeper-relationship-annotate').then(
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

				// edit
				cy.wrap(parent)
					.find('#id-someString')
					.type(' edited');
				cy.wrap(parent)
					.find('#id-anotherString')
					.type(' edited');
				cy.wrap(parent)
					.find('#id-someInteger')
					.clear()
					// this will make the form submission error as the value is not a finite integer
					.type(20.23);
				cy.wrap(parent)
					.find('#id-someEnum')
					.select('Third');
				cy.wrap(parent)
					.find('#checkbox-someMultipleChoice-First')
					.uncheck({ force: true });
				cy.wrap(parent)
					.find('#checkbox-someMultipleChoice-Third')
					.uncheck({
						force: true,
					});
				cy.wrap(parent)
					.find('#checkbox-someMultipleChoice-Second')
					.check({ force: true });
			},
		);
		save();

		cy.url().should('contain', `/MainType/${code}/edit`);
		// assert submission has thrown an error
		cy.get('.o-message__content-main').should(
			'contain',
			'Oops. Could not update MainType record for e2e-demo',
		);
		cy.get('.o-message__content-additional').should(
			'contain',
			`Invalid value \`20.23\` for property \`someInteger\` on type \`CuriousChild\`: Must be a finite integer`,
		);

		// assert in-progress edits are restored
		cy.get('#ul-curiousChild .treecreeper-relationship-annotate').then(
			parent => {
				// assert it shows in-progress changes not original data
				cy.wrap(parent)
					.find('#id-someString')
					.should('have.value', 'lorem ipsum edited');
				cy.wrap(parent)
					.find('#id-anotherString')
					.should('have.value', 'another lorem ipsum edited');
				cy.wrap(parent)
					.find('#id-someInteger')
					// the value that caused the error not 2020
					.should('have.value', '20.23');
				cy.wrap(parent)
					.find('#id-someEnum')
					.children()
					.eq(3)
					.should('have.value', 'Third')
					.should('be.selected');
				cy.wrap(parent)
					.find('#checkbox-someMultipleChoice-First')
					.should('not.be.checked');
				cy.wrap(parent)
					.find('#checkbox-someMultipleChoice-Second')
					.should('be.checked');
				cy.wrap(parent)
					.find('#checkbox-someMultipleChoice-Third')
					.should('not.be.checked');
				// original data form neo4j
				cy.wrap(parent)
					.find('#radio-someBoolean-Yes')
					.should('be.checked');
				cy.wrap(parent)
					.find('#id-someFloat')
					.should('have.value', '12.53');
			},
		);
	});
});
