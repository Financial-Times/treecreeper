const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-primitives-enum';
const code = `${namespace}-code`;

const save = () =>
	cy.get('[data-button-type="submit"]').click({
		force: true,
	});

const createRecord = (props = {}) =>
	cy.wrap(
		executeQuery(`CREATE (:PropertiesTest $props)`, {
			props: { code, ...props },
		}),
	);

describe('End-to-end - Enum primitive', () => {
	afterEach(() => cy.wrap(dropFixtures(namespace)));

	// this is currently buggy
	it.skip('view empty state', () => {
		createRecord();
		cy.visit(`/PropertiesTest/${code}`);
		cy.get('#enumProperty').should('have.text', '');
	});

	it('edit empty state', () => {
		createRecord();
		cy.visit(`/PropertiesTest/${code}/edit`);
		cy.get('select[name=enumProperty]').should('not.be.selected');
	});

	it('can select a value', () => {
		createRecord();
		cy.visit(`/PropertiesTest/${code}/edit`);
		cy.get('select[name=enumProperty]').select('First');
		save();
		cy.get('#enumProperty').should('have.text', 'First');
	});

	it('can select a different value', () => {
		createRecord({ enumProperty: 'First' });
		cy.visit(`/PropertiesTest/${code}/edit`);
		cy.get('select[name=enumProperty]').should('have.value', 'First');
		cy.get('select[name=enumProperty]').select('Third');
		save();
		cy.get('#enumProperty').should('have.text', 'Third');
	});
});
