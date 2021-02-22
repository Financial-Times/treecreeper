const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-simple-relationship-primitive';
const codeMany1 = `${namespace}-many1`;
const codeMany2 = `${namespace}-many2`;
const codeMany3 = `${namespace}-many3`;
const codeOne1 = `${namespace}-one1`;
const codeOne2 = `${namespace}-one2`;
const save = () =>
	cy.get('[data-button-type="submit"]').click({
		force: true,
	});

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

// VERY IMPORTANT NOTE
// This does not actually test the simple relationship primitive
// because currently the only way to use an edit component is to
// run a tc-ui edit page, which chooses (for good reasons) to use
// the rich relationship component everywhere, but it detects there
// are no rich relationship properties available on the relationship
// and displays something identical to the simple relationship component
// for that case
//
// These tests are written here because .. it felt like a good idea 5 miutes ago
describe('End-to-end - Simple relationship primitive', () => {
	before(() => {
		cy.wrap(dropFixtures(namespace));
		cy.wrap(createRecords());
	});
	afterEach(() => cy.wrap(detachFixtures()));
	after(() => {
		cy.wrap(dropFixtures(namespace));
	});

	// simple

	// 	__-to-one
	// 		- disable button after selecting one
	// 		- reenable button after removing

	// disable based on lockedness of record
	// disable based on locked in schema

	// cy.get('#simpleRelationship-picker') // eslint-disable-line cypress/no-unnecessary-waiting
	// 	.type('e2e')
	// 	.wait(500)
	// 	.type('{downarrow}{enter}')
	// 	.should('not.be.disabled');
	// cy.get('#simpleRelationship')
	// 	.should('have.text', `${code}-first-child`)
	// 	.should('have.attr', 'href', `/ChildType/${code}-first-child`);

	describe('empty state', () => {
		it.skip('view empty state', () => {
			cy.visit(`/RelationshipTestsOne/${codeOne1}`);
			cy.get('#simpleRelationship').should('have.text', 'Unknown');
		});

		it('edit empty state', () => {
			cy.visit(`/RelationshipTestsOne/${codeOne1}/edit`);
			cy.get('#id-simpleRelationship').should('have.value', '[]');
			cy.get('#ul-simpleRelationship')
				.children()
				.should('have.lengthOf', 0);
		});
	});

	describe('autocomplete', () => {
		it('does not search based on single character', () => {
			cy.visit(`/RelationshipTestsOne/${codeOne1}/edit`);
			cy.get('#simpleRelationship-picker') // eslint-disable-line cypress/no-unnecessary-waiting
				.type('e')
				.wait(500);

			cy.get(
				'[for="id-simpleRelationship"] .react-autosuggest__suggestions-container',
			)
				.children()
				.should('have.lengthOf', 0);
			// 	.type('{downarrow}{enter}')
			// 	.should('not.be.disabled');
			// cy.get('#simpleRelationship')
			// 	.should('have.text', `${code}-first-child`)
			// 	.should('have.attr', 'href', `/ChildType/${code}-first-child`);
		});
		it('handles no result sensibly', () => {
			cy.visit(`/RelationshipTestsOne/${codeOne1}/edit`);
			cy.get('#simpleRelationship-picker') // eslint-disable-line cypress/no-unnecessary-waiting
				.type('esadadsad')
				.wait(500);

			cy.get(
				'[for="id-simpleRelationship"] .react-autosuggest__suggestions-container',
			)
				.children()
				.should('have.lengthOf', 0);
		});
		it('shows name and code in search drop down', () => {
			cy.visit(`/RelationshipTestsOne/${codeOne1}/edit`);
			cy.get('#simpleRelationship-picker') // eslint-disable-line cypress/no-unnecessary-waiting
				.type('e2e')
				.wait(500);

			cy.get(
				'[for="id-simpleRelationship"] .react-autosuggest__suggestions-container',
			).should('have.lengthOf', 1);
			const suggestionsSelector =
				'[for="id-simpleRelationship"] .react-autosuggest__suggestions-container [role="listbox"]';
			cy.get(suggestionsSelector).children().should('have.lengthOf', 3);
			cy.get(suggestionsSelector)
				.children()
				.eq(0)
				.should(
					'have.text',
					'Many 1 (e2e-simple-relationship-primitive-many1)',
				);
			cy.get(suggestionsSelector)
				.children()
				.eq(1)
				.should(
					'have.text',
					'Many 2 (e2e-simple-relationship-primitive-many2)',
				);
			cy.get(suggestionsSelector)
				.children()
				.eq(2)
				.should(
					'have.text',
					'Many 3 (e2e-simple-relationship-primitive-many3)',
				);
		});
	});

	describe('__-to-many relationships', () => {
		it('find and add a relationship', () => {
			cy.visit(`/RelationshipTestsOne/${codeOne1}/edit`);
			cy.get('#simpleRelationship-picker') // eslint-disable-line cypress/no-unnecessary-waiting
				.type('e2e')
				.wait(500)
				.type('{downarrow}{enter}')
				.should('not.be.disabled');
			cy.get('#simpleRelationship-picker').should('have.value', '');
			cy.get('#ul-simpleRelationship')
				.children()
				.should('have.lengthOf', 1);
			cy.get('#ul-simpleRelationship')
				.children()
				.first()
				.find('.o-layout-typography')
				.should('have.text', 'Many 1');
			save();
			cy.get('#simpleRelationship').children().should('have.lengthOf', 1);
			cy.get('#simpleRelationship')
				.children()
				.first()
				.find('a')
				.should('have.text', 'Many 1');
			cy.get('#simpleRelationship')
				.children()
				.first()
				.find('a')
				.should(
					'have.attr',
					'href',
					`/RelationshipTestsMany/${codeMany1}`,
				);
		});

		it('find and add multiple relationships', () => {
			cy.visit(`/RelationshipTestsOne/${codeOne1}/edit`);
			cy.get('#simpleRelationship-picker') // eslint-disable-line cypress/no-unnecessary-waiting
				.type('e2e')
				.wait(500)
				.type('{downarrow}{enter}')
				.should('not.be.disabled');
			cy.get('#simpleRelationship-picker') // eslint-disable-line cypress/no-unnecessary-waiting
				.type('e2e')
				.wait(500)
				.type('{downarrow}{downarrow}{enter}')
				.should('not.be.disabled');
			cy.get('#ul-simpleRelationship')
				.children()
				.should('have.lengthOf', 2);
			cy.get('#ul-simpleRelationship')
				.children()
				.eq(0)
				.find('.o-layout-typography')
				.should('have.text', 'Many 1');
			cy.get('#ul-simpleRelationship')
				.children()
				.eq(1)
				.find('.o-layout-typography')
				.should('have.text', 'Many 3');
			save();
			cy.get('#simpleRelationship').children().should('have.lengthOf', 2);
			cy.get('#simpleRelationship')
				.children()
				.eq(0)
				.find('a')
				.should('have.text', 'Many 1');
			cy.get('#simpleRelationship')
				.children()
				.eq(0)
				.find('a')
				.should(
					'have.attr',
					'href',
					`/RelationshipTestsMany/${codeMany1}`,
				);
			cy.get('#simpleRelationship')
				.children()
				.eq(1)
				.find('a')
				.should('have.text', 'Many 3');
			cy.get('#simpleRelationship')
				.children()
				.eq(1)
				.find('a')
				.should(
					'have.attr',
					'href',
					`/RelationshipTestsMany/${codeMany3}`,
				);
		});

		it('display multiple relationships remove one', () => {
			cy.wrap(
				executeQuery(`
			 MERGE (a:RelationshipTestsMany {code: "${codeMany1}"})-[:MANY_TO_ONE]->(c:RelationshipTestsOne {code: "${codeOne1}"})<-[:MANY_TO_ONE]-(b:RelationshipTestsMany {code: "${codeMany2}"})
			 RETURN a, b, c
`),
			);
			cy.visit(`/RelationshipTestsOne/${codeOne1}`);
		});

		it('display relationships remove all', () => {});
	});

	// it('edit empty state', () => {
	// 	createRecord();
	// 	cy.visit(`/KitchenSink/${code}/edit`);
	// 	cy.get('#radio-booleanProperty-Yes').should('not.be.checked');
	// 	cy.get('#radio-booleanProperty-No').should('not.be.checked');
	// });

	// it('can set to true', () => {
	// 	createRecord();
	// 	cy.visit(`/KitchenSink/${code}/edit`);
	// 	cy.get('#radio-booleanProperty-Yes').check({ force: true });
	// 	save();
	// 	cy.get('#booleanProperty').should('have.text', 'Yes');
	// });

	// it('can set to false', () => {
	// 	createRecord();
	// 	cy.visit(`/KitchenSink/${code}/edit`);
	// 	cy.get('#radio-booleanProperty-No').check({ force: true });
	// 	save();
	// 	cy.get('#booleanProperty').should('have.text', 'No');
	// });

	// it('can change a value', () => {
	// 	createRecord({ booleanProperty: true });
	// 	cy.visit(`/KitchenSink/${code}/edit`);
	// 	cy.get('#radio-booleanProperty-Yes').should('be.checked');
	// 	cy.get('#radio-booleanProperty-No').should('not.be.checked');
	// 	cy.get('#radio-booleanProperty-No').check({ force: true });
	// 	save();
	// 	cy.get('#booleanProperty').should('have.text', 'No');
	// });
});
