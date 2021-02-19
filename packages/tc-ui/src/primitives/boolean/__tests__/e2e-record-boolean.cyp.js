const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-demo-primitives-boolean';
const code = `${namespace}-code`;

const save = () =>
	cy.get('[data-button-type="submit"]').click({
		force: true,
	});

describe('End-to-end - Boolean primitive', () => {
	afterEach(() => cy.wrap(dropFixtures(namespace)));

	it('view empty state', () => {
		cy.wrap(
			executeQuery(`CREATE (:KitchenSink $props)`, {
				props: { code },
			}),
		);
		cy.visit(`/KitchenSink/${code}`);
		cy.get('#booleanProperty').should('have.text', 'Unknown');
	});

	it('edit empty state', () => {
		cy.wrap(
			executeQuery(`CREATE (:KitchenSink $props)`, {
				props: { code },
			}),
		);
		cy.visit(`/KitchenSink/${code}/edit`);
		cy.get('#radio-booleanProperty-Yes').should('not.be.checked');
		cy.get('#radio-booleanProperty-No').should('not.be.checked');
	});

	it('can set to true', () => {
		cy.wrap(
			executeQuery(`CREATE (:KitchenSink $props)`, {
				props: { code },
			}),
		);
		cy.visit(`/KitchenSink/${code}/edit`);
		cy.get('#radio-booleanProperty-Yes').check({ force: true });
		save();
		cy.get('#booleanProperty').should('have.text', 'Yes');
	});

	it('can set to false', () => {
		cy.wrap(
			executeQuery(`CREATE (:KitchenSink $props)`, {
				props: { code },
			}),
		);
		cy.visit(`/KitchenSink/${code}/edit`);
		cy.get('#radio-booleanProperty-No').check({ force: true });
		save();
		cy.get('#booleanProperty').should('have.text', 'No');
	});

	it('can change a value', () => {
		cy.wrap(
			executeQuery(`CREATE (:KitchenSink $props)`, {
				props: { code, booleanProperty: true },
			}),
		);
		cy.visit(`/KitchenSink/${code}/edit`);
		cy.get('#radio-booleanProperty-Yes').should('be.checked');
		cy.get('#radio-booleanProperty-No').should('not.be.checked');
		cy.get('#radio-booleanProperty-No').check({ force: true });
		save();
		cy.get('#booleanProperty').should('have.text', 'No');
	});
});
