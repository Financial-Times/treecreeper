const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-demo-primitives-text';
const code = `${namespace}-code`;

const save = () =>
	cy.get('[data-button-type="submit"]').click({
		force: true,
	});

const createRecord = (props = {}) =>
	cy.wrap(
		executeQuery(`CREATE (:KitchenSink $props)`, {
			props: { code, ...props },
		}),
	);

describe('End-to-end - Text primitive', () => {
	before(() => cy.wrap(dropFixtures(namespace)));
	afterEach(() => cy.wrap(dropFixtures(namespace)));

	it('view empty state', () => {
		createRecord();
		cy.visit(`/KitchenSink/${code}`);
		cy.get('#firstStringProperty').should('have.text', '');
	});

	it('edit empty state', () => {
		createRecord();
		cy.visit(`/KitchenSink/${code}/edit`);
		cy.get('input[name=firstStringProperty]').should('have.value', '');
	});

	const textInput = 'Long text';

	it('can set value', () => {
		createRecord();
		cy.visit(`/KitchenSink/${code}/edit`);
		cy.get('input[name=firstStringProperty]').type(textInput);
		save();
		cy.get('#firstStringProperty').should('have.text', textInput);
	});

	it('can update large text', () => {
		createRecord({ firstStringProperty: 'previous' });
		cy.visit(`/KitchenSink/${code}/edit`);
		cy.get('input[name=firstStringProperty]').type(textInput);
		save();
		cy.get('#firstStringProperty').should(
			'have.text',
			`previous${textInput}`,
		);
	});
});
