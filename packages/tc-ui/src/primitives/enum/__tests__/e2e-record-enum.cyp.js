const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-demo-primitives-enum';
const code = `${namespace}-code`;

const save = () =>
	cy.get('[data-button-type="submit"]').click({
		force: true,
	});

describe('End-to-end - record Boolean type', () => {

	afterEach(() => cy.wrap(dropFixtures(namespace)));

	// this is currently buggy
	it.skip('empty state', () => {
		cy.wrap(
			executeQuery(`CREATE (:KitchenSink $props)`, {
				props: { code },
			})
		);
		cy.visit(`/KitchenSink/${code}`);
		cy.get('#enumProperty').should('have.text', 'Unknown');
	});

	it('can record a selection', () => {
		cy.wrap(
			executeQuery(`CREATE (:KitchenSink $props)`, {
				props: { code },
			})
		);
		cy.visit(`/KitchenSink/${code}/edit`);
		cy.get('select[name=enumProperty]').select('First');
		save();
		cy.get('#enumProperty').should('have.text', 'First');
	});

	it('can select a different value', () => {
		cy.wrap(
			executeQuery(`CREATE (:KitchenSink $props)`, {
				props: { code, enumProperty: 'First' },
			})
		);
		cy.visit(`/KitchenSink/${code}/edit`);
		cy.get('select[name=enumProperty]').select('Third');
		save();
		cy.get('#enumProperty').should('have.text', 'Third');
	});


});
