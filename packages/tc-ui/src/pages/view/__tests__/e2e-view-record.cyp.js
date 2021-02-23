const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-page-view';
const code = `${namespace}-code`;

describe('End-to-end - page view', () => {
	before(() => {
		cy.wrap(dropFixtures(namespace));
	});
	afterEach(() => {
		cy.wrap(dropFixtures(namespace));
	});

	it('can display a record', () => {
		cy.wrap(executeQuery(`CREATE (:PropertiesTest {code: "${code}"})`));
		cy.visit(`/PropertiesTest/${code}`);

		cy.url().should('contain', `/PropertiesTest/${code}`);
		cy.get('[data-button-type="delete"]').should('exist');
		cy.get('[data-button-type="edit"]').should('exist');
		cy.get('#code').should('have.text', code);
	});

	it('useInSummary hides and shows properties', () => {
		cy.wrap(
			executeQuery(`
				CREATE (:PropertiesTest {code: "${code}"})
`),
		);
		cy.visit(`/PropertiesTest/${code}`);

		// has useInSummary: true, so shown despite being empty
		cy.get('#firstStringProperty').should('have.text', '');
		// has useInSummary: false, so not shown as empty
		cy.get('#secondStringProperty').should('not.exist');
		cy.wrap(
			executeQuery(`
				MERGE (n:PropertiesTest {code: "${code}"})
				SET n.secondStringProperty = "a string"
				RETURN n
`),
		);
		cy.visit(`/PropertiesTest/${code}`);
		cy.get('#secondStringProperty').should('have.text', 'a string');
	});
});
