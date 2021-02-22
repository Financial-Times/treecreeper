const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-primitives-multiple-choice';
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
	before(() => cy.wrap(dropFixtures(namespace)));
	afterEach(() => cy.wrap(dropFixtures(namespace)));

	// buggy for some reason
	it.skip('view empty state', () => {
		createRecord();
		cy.visit(`/PropertiesTest/${code}`);
		cy.get('#multipleChoiceEnumProperty')
			.children()
			.should('have.length', 0);
	});

	it('edit empty state', () => {
		createRecord();
		cy.visit(`/PropertiesTest/${code}/edit`);
		cy.get('#checkbox-multipleChoiceEnumProperty-First')
			.should('have.value', 'First')
			.should('not.be.checked');
		cy.get('#checkbox-multipleChoiceEnumProperty-Second')
			.should('have.value', 'Second')
			.should('not.be.checked');
		cy.get('#checkbox-multipleChoiceEnumProperty-Third')
			.should('have.value', 'Third')
			.should('not.be.checked');
	});

	it('can select multiple values', () => {
		createRecord();
		cy.visit(`/PropertiesTest/${code}/edit`);

		cy.get('#checkbox-multipleChoiceEnumProperty-First').check({
			force: true,
		});
		cy.get('#checkbox-multipleChoiceEnumProperty-Third').check({
			force: true,
		});

		cy.get('#checkbox-multipleChoiceEnumProperty-First')
			.should('have.value', 'First')
			.should('be.checked');
		cy.get('#checkbox-multipleChoiceEnumProperty-Second')
			.should('have.value', 'Second')
			.should('not.be.checked');
		cy.get('#checkbox-multipleChoiceEnumProperty-Third')
			.should('have.value', 'Third')
			.should('be.checked');
		save();

		cy.get('#multipleChoiceEnumProperty')
			.children()
			.should('have.length', 2);
		cy.get('#multipleChoiceEnumProperty span:first-child').should(
			'have.text',
			'First',
		);
		cy.get('#multipleChoiceEnumProperty span:nth-child(2)').should(
			'have.text',
			'Third',
		);
	});

	it('can edit selected values', () => {
		createRecord({ multipleChoiceEnumProperty: ['First', 'Third'] });
		cy.visit(`/PropertiesTest/${code}/edit`);
		cy.get('#checkbox-multipleChoiceEnumProperty-First').uncheck({
			force: true,
		});
		cy.get('#checkbox-multipleChoiceEnumProperty-Second').check({
			force: true,
		});
		cy.get('#checkbox-multipleChoiceEnumProperty-Third').uncheck({
			force: true,
		});
		cy.get('#checkbox-multipleChoiceEnumProperty-First')
			.should('have.value', 'First')
			.should('not.be.checked');
		cy.get('#checkbox-multipleChoiceEnumProperty-Second')
			.should('have.value', 'Second')
			.should('be.checked');
		cy.get('#checkbox-multipleChoiceEnumProperty-Third')
			.should('have.value', 'Third')
			.should('not.be.checked');
		save();

		cy.get('#multipleChoiceEnumProperty')
			.children()
			.should('have.length', 1);
		cy.get('#multipleChoiceEnumProperty span:first-child').should(
			'have.text',
			'Second',
		);
	});

	it('can deselect all values', () => {
		createRecord({
			multipleChoiceEnumProperty: ['First', 'Second', 'Third'],
		});
		cy.visit(`/PropertiesTest/${code}/edit`);
		cy.get('#checkbox-multipleChoiceEnumProperty-First').uncheck({
			force: true,
		});
		cy.get('#checkbox-multipleChoiceEnumProperty-Second').uncheck({
			force: true,
		});
		cy.get('#checkbox-multipleChoiceEnumProperty-Third').uncheck({
			force: true,
		});
		cy.get('#checkbox-multipleChoiceEnumProperty-First')
			.should('have.value', 'First')
			.should('not.be.checked');
		cy.get('#checkbox-multipleChoiceEnumProperty-Second')
			.should('have.value', 'Second')
			.should('not.be.checked');
		cy.get('#checkbox-multipleChoiceEnumProperty-Third')
			.should('have.value', 'Third')
			.should('not.be.checked');
		save();

		cy.get('#multipleChoiceEnumProperty').should('not.exist')
	});
});
