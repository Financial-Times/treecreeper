const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-demo-primitives-boolean';
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

describe('End-to-end - Boolean primitive', () => {
	before(() => cy.wrap(dropFixtures(namespace)));
	afterEach(() => cy.wrap(dropFixtures(namespace)));

	it('view empty state', () => {
		createRecord();
		cy.visit(`/PropertiesTest/${code}`);
		cy.get('#booleanProperty').should('have.text', 'Unknown');
	});

	it('edit empty state', () => {
		createRecord();
		cy.visit(`/PropertiesTest/${code}/edit`);
		cy.get('#radio-booleanProperty-Yes').should('not.be.checked');
		cy.get('#radio-booleanProperty-No').should('not.be.checked');
	});

	it('can set to true', () => {
		createRecord();
		cy.visit(`/PropertiesTest/${code}/edit`);
		cy.get('#radio-booleanProperty-Yes').check({ force: true });
		save();
		cy.get('#booleanProperty').should('have.text', 'Yes');
	});

	it('can set to false', () => {
		createRecord();
		cy.visit(`/PropertiesTest/${code}/edit`);
		cy.get('#radio-booleanProperty-No').check({ force: true });
		save();
		cy.get('#booleanProperty').should('have.text', 'No');
	});

	it('can change a value', () => {
		createRecord({ booleanProperty: true });
		cy.visit(`/PropertiesTest/${code}/edit`);
		cy.get('#radio-booleanProperty-Yes').should('be.checked');
		cy.get('#radio-booleanProperty-No').should('not.be.checked');
		cy.get('#radio-booleanProperty-No').check({ force: true });
		save();
		cy.get('#booleanProperty').should('have.text', 'No');
	});
});
