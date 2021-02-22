const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-rich-relationship-primitive';
const codeMany1 = `${namespace}-many1`;
const codeMany2 = `${namespace}-many2`;
const codeMany3 = `${namespace}-many3`;
const codeOne1 = `${namespace}-one1`;
const codeOne2 = `${namespace}-one2`;

const save = () =>
	cy.get('[data-button-type="submit"]').click({
		force: true,
	});

const getPicker = () => cy.get('#richRelationship-picker');

const search = term => getPicker().type(term).wait(500);

const assertSelected = (...texts) => {
	cy.get('#ul-richRelationship')
		.children()
		.should('have.lengthOf', texts.length);
	texts.forEach((text, i) => {
		cy.get('#ul-richRelationship')
			.children()
			.eq(i)
			.find('.o-layout-typography')
			.should('have.text', text);
	});
};

const createRecords = () =>
	executeQuery(`
			CREATE (a:RelationshipTestsMany),
				(b:RelationshipTestsMany),
				(c:RelationshipTestsMany),
				(d:RelationshipTestsOne),
				(e:RelationshipTestsOne)
			SET a = {code: "${codeMany1}", name: "Many 1"}
			SET b = {code: "${codeMany2}", name: "Many 2"}
			SET c = {code: "${codeMany3}", name: "Many 3"}
			SET d = {code: "${codeOne1}"}
			SET e = {code: "${codeOne2}"}
			RETURN a, b, c, d, e
`);

const detachFixtures = () =>
	executeQuery(`
	MATCH (n)-[r]-() WHERE n.code STARTS WITH "${namespace}" DELETE r
`);

describe('End-to-end - Rich relationship primitive; rich relationships', () => {
	before(() => {
		cy.wrap(dropFixtures(namespace));
		cy.wrap(createRecords());
	});

	after(() => {
		cy.wrap(dropFixtures(namespace));
	});

	describe('view', () => {
		context('__-to-many', () => {
			before(() => {
				cy.wrap(
					executeQuery(`
					MATCH (a:RelationshipTestsMany), (c:RelationshipTestsOne), (b:RelationshipTestsMany)
					WHERE a.code = "${codeMany1}" AND c.code = "${codeOne1}" AND b.code = "${codeMany2}"
					WITH a, b, c
					MERGE (a)-[r:RICH_MANY_TO_ONE]->(c)<-[s:RICH_MANY_TO_ONE]-(b)
					SET r.stringProperty = "apples"
					RETURN a, b, c
					`),
				);
				cy.visit(`/RelationshipTestsOne/${codeOne1}`);
			});

			after(() => cy.wrap(detachFixtures()));

			it('shows no annotations if none set', () => {
				cy.get('#richRelationship')
					.children()
					.eq(1)
					.find('[data-o-component="o-expander"]')
					.should('have.lengthOf', 0);
			});
			it('hides annotations by default', () => {
				cy.get('#richRelationship')
					.children()
					.eq(0)
					.find(
						'[data-o-component="o-expander"] .o-expander__content',
					)
					.should('not.be.visible');
			});
			it('show annotations when clicked', () => {
				cy.get('#richRelationship')
					.children()
					.eq(0)
					.find('[aria-controls="o-expander__toggle--1"]')
					.should('have.text', 'view details')
					.click();
				cy.get('#richRelationship')
					.children()
					.eq(0)
					.find(
						'[data-o-component="o-expander"] .o-expander__content',
					)
					.should('be.visible');
			});
			it('hide annotations when hidden', () => {
				cy.get('#richRelationship')
					.children()
					.eq(0)
					.find('[aria-controls="o-expander__toggle--1"]')
					.should('have.text', 'hide details')
					.click();
				cy.get('#richRelationship')
					.children()
					.eq(0)
					.find(
						'[data-o-component="o-expander"] .o-expander__content',
					)
					.should('not.be.visible');
			});
		});

		context('__-to-one', () => {
			before(() => {
				cy.wrap(
					executeQuery(`
					MATCH (a:RelationshipTestsMany), (c:RelationshipTestsOne), (b:RelationshipTestsMany)
					WHERE a.code = "${codeMany1}" AND c.code = "${codeOne1}" AND b.code = "${codeMany2}"
					WITH a, b, c
					MERGE (a)-[r:RICH_MANY_TO_ONE]->(c)<-[s:RICH_MANY_TO_ONE]-(b)
					SET r.stringProperty = "apples"
					RETURN a, b, c
					`),
				);
			});

			after(() => cy.wrap(detachFixtures()));

			it('shows no annotations if none set', () => {
				cy.visit(`/RelationshipTestsMany/${codeMany2}`);
				cy.get('#richRelationship')
					.find('[data-o-component="o-expander"]')
					.should('have.lengthOf', 0);
			});
			context('with annotations', () => {
				before(() => {
					cy.visit(`/RelationshipTestsMany/${codeMany1}`);
				});

				it('hides annotations by default', () => {
					cy.get('#richRelationship')
						.find(
							'[data-o-component="o-expander"] .o-expander__content',
						)
						.should('not.be.visible');
				});
				it('show annotations when clicked', () => {
					cy.get('#richRelationship')
						.next('[data-o-component="o-expander"]')
						.find('[aria-controls="o-expander__toggle--1"]')
						.should('have.text', 'view details')
						.click();
					cy.get('#richRelationship')
						.next('[data-o-component="o-expander"]')
						.find('.o-expander__content')
						.should('be.visible');
				});
				it('hide annotations when hidden', () => {
					cy.get('#richRelationship')
						.next('[data-o-component="o-expander"]')
						.find('[aria-controls="o-expander__toggle--1"]')
						.should('have.text', 'hide details')
						.click();
					cy.get('#richRelationship')
						.next('[data-o-component="o-expander"]')
						.find('.o-expander__content')
						.should('not.be.visible');
				});
			});
		});
	});
});

describe('edit', () => {
	// 	- 'collapses annotation fields on page load for existing relationships'
	// - 'sets label of the button as "Add details", if no annotations already exist for existing relationships'
	// - 'sets label of the button as "Edit details", if annotations already exist for existing relationships'
	// - 'displays annotation fields when annotation button is clicked'
	// - 'disables the annotation button once annotations area is opened'
	// - 'can edit an existing annotated relationship'
	// - 'can remove a relationship with annotations'
	// - 'can remove all annotations from a relationship'
	// - 'restores in-progress edits to the relationship annotations if the form is submitted but errors'
	// - 'expands annotations area when adding new relationship'
	// - 'can add a new relationship without annotations'
	// - 'displays all fields defined for that relationship property'
	// - 'can add a new relationship with annotations'
});
