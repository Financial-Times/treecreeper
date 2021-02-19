const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-demo-primitives-boolean';
const code = `${namespace}-code`;

const save = () =>
	cy.get('[data-button-type="submit"]').click({
		force: true,
	});

describe('End-to-end - record Boolean type', () => {

	afterEach(() => cy.wrap(dropFixtures(namespace)));

	it('empty state', () => {
		cy.wrap(
			executeQuery(`CREATE (:KitchenSink $props)`, {
				props: { code },
			})
		);
		cy.visit(`/KitchenSink/${code}`);
		cy.get('#booleanProperty').should('have.text', 'Unknown');
	});

	it('can record a true value', () => {
		cy.wrap(
			executeQuery(`CREATE (:KitchenSink $props)`, {
				props: { code },
			})
		);
		cy.visit(`/KitchenSink/${code}/edit`);
		cy.get('#radio-booleanProperty-Yes').check({ force: true });
		save();
		cy.get('#booleanProperty').should('have.text', 'Yes');
	});

	it('can record a false value', () => {
		cy.wrap(
			executeQuery(`CREATE (:KitchenSink $props)`, {
				props: { code },
			})
		);
		cy.visit(`/KitchenSink/${code}/edit`);
		cy.get('#radio-booleanProperty-No').check({ force: true });
		save();
		cy.get('#booleanProperty').should('have.text', 'No');
	});
});
