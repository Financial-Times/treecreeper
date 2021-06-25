/* eslint-disable cypress/no-unnecessary-waiting */
const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-edit-record';
const code = `${namespace}-code`;

const save = () =>
	cy.get('[data-button-type="submit"]').click({
		force: true,
	});

const createRecord = type => {
	cy.wrap(executeQuery(`CREATE (a:${type} {code: "${code}"})`));
};

// TODO
// hides deprecated fields
// hides @cypher fields

describe('End-to-end - record creation', () => {
	before(() => {
		cy.wrap(dropFixtures(namespace));
	});
	afterEach(() => {
		cy.wrap(dropFixtures(namespace));
	});

	it('can edit a record', () => {
		createRecord('PropertiesTest');
		cy.visit(`/PropertiesTest/${code}/edit`);

		cy.get('input[name="firstStringProperty"]').type('new string');
		save();

		cy.url().should(
			'contain',
			`PropertiesTest/${code}?message=PropertiesTest%20${code}%20was%20successfully%20updated&message`,
		);
		cy.get('#firstStringProperty').should('have.text', 'new string');
	});

	it('the code field of the record should be disabled', () => {
		createRecord('PropertiesTest');
		cy.visit(`/PropertiesTest/${code}/edit`);
		cy.get('input[name="code"]').should('be.disabled');
	});

	// it('cannot edit code of record', () => {
	// 	createRecord('PropertiesTest');
	// 	cy.visit(`/PropertiesTest/${code}/edit`);
	//
	// 	cy.get('input[name="code"]').type('-test');
	// 	save();
	// 	cy.url().should('contain', `/PropertiesTest/${code}/edit`);
	// 	cy.get('.o-message__content-main').should(
	// 		'contain',
	// 		`Oops. Could not update PropertiesTest record for ${code}.`,
	// 	);
	// 	cy.get('.o-message__content-additional').should(
	// 		'contain',
	// 		`Conflicting code property \`${code}-test\` in payload for PropertiesTest ${code}`,
	// 	);
	// });

	it('preserves data after error', () => {
		createRecord('PropertiesTest');
		cy.visit(`/PropertiesTest/${code}/edit`);

		cy.get('input[name="firstStringProperty"]').type('some text');
		cy.get('input[name="integerProperty"]').type('not a number');
		save();

		cy.url().should('contain', `/PropertiesTest/${code}`);

		cy.get('.o-message__content-main').should(
			'contain',
			`Oops. Could not update PropertiesTest record for ${code}`,
		);
		cy.get('.o-message__content-additional').should(
			'contain',
			`Invalid value \`not a number\` for property \`integerProperty\` on type \`PropertiesTest\`: Must be a finite integer`,
		);
		cy.get('input[name="firstStringProperty"]').should(
			'have.value',
			'some text',
		);
		cy.get('input[name="integerProperty"]').should(
			'have.value',
			'not a number',
		);
	});

	// see /demo/cms/components/primitives.jsx for where this component is passed in
	it('hydrates additional edit components with full record data', () => {
		createRecord('PropertiesTest');
		cy.visit(`/PropertiesTest/${code}/edit`);

		cy.get('.additional-edit-component-hydration-container').should(
			'exist',
		);

		// checks that it is the second child of its parent
		cy.get('.additional-edit-component-hydration-container')
			.parent()
			.children()
			.first()
			.next()
			.should(
				'have.class',
				'additional-edit-component-hydration-container',
			);

		// checks that the component is only rendered once
		cy.get('.additional-edit-component-hydration-container').should(
			'have.length',
			1,
		);

		// Checks that the component has access to props
		cy.get('.additional-edit-component').should(
			'have.text',
			`This value: ${code}`,
		);
	});

	it('useInSummary does not hide properties', () => {
		createRecord('PropertiesTest');
		cy.visit(`/PropertiesTest/${code}/edit`);

		cy.get('input[name="secondStringProperty"]').should('exist');
	});

	it('does not submit entire form when relationship input selection using Enter key press', () => {
		createRecord('RelationshipTestsOne');
		cy.wrap(
			executeQuery(
				`CREATE (a:RelationshipTestsMany {code: "${code}-many"})`,
			),
		);

		cy.visit(`/RelationshipTestsOne/${code}/edit`);

		cy.get('#simpleRelationship-picker') // eslint-disable-line cypress/no-unnecessary-waiting
			.type(code)
			.wait(500)
			.type('{enter}');

		cy.get(`[data-code="${code}-many"]`).should('contain', `${code}-many`);

		cy.url().should('contain', `RelationshipTestsOne/${code}/edit`);

		save();

		cy.url().should(
			'contain',
			`RelationshipTestsOne/${code}?message=RelationshipTestsOne%20${code}%20was%20successfully%20updated&message`,
		);
	});

	it('fieldsets used on edit screen', () => {
		createRecord('FieldsetType');
		cy.visit(`/FieldsetType/${code}/edit`);
		cy.get('.fieldset-fieldsetA').should('exist');
		cy.get('#fieldset-a').contains('Fieldset A');
		cy.get('.fieldset-fieldsetB').should('exist');
		cy.get('#fieldset-b').contains('Fieldset B');
		cy.get('.fieldset-fieldsetB-description').should('exist');
		cy.get('.fieldset-fieldsetB-description').should(
			'have.text',
			'I have a lovely description.',
		);
		cy.get('.fieldset-fieldsetA-description').should('exist');
		cy.get('.fieldset-fieldsetA-description').should('have.text', '');
	});

	it('disables canonically locked fields, but saves record anyway', () => {
		createRecord('LockedFieldTest');
		cy.visit(`/LockedFieldTest/${code}/edit`);
		cy.get('input[name=lockedField]').should('not.exist');
		cy.get('input[name=lockedField-disabled]').should('be.disabled');
		save();
		cy.url().should(
			'contain',
			`LockedFieldTest/${code}?message=LockedFieldTest%20${code}%20was%20successfully%20updated&message`,
		);
	});

	it('disables specifically locked fields, but saves record anyway', () => {
		cy.wrap(
			executeQuery(
				`CREATE (a:PropertiesTest {code: "${code}"})
				SET a.firstStringProperty="a string"
				SET a._lockedFields='{"firstStringProperty":"another-client"}' `,
			),
		);
		cy.visit(`/PropertiesTest/${code}/edit`);
		cy.get('input[name=firstStringProperty]').should('not.exist');
		cy.get('input[name=firstStringProperty-disabled]').should(
			'be.disabled',
		);
		save();
		cy.url().should(
			'contain',
			`PropertiesTest/${code}?message=PropertiesTest%20${code}%20was%20successfully%20updated&message`,
		);
	});
	it('can edit MVR record even when mvr fields are not populated', () => {
		createRecord('MVRType');
		cy.visit(`/MVRType/${code}/edit`);
		cy.get('input[name=stringProperty]').type('a string');
		save();
		cy.url().should('contain', `/MVRType/${code}`);
		cy.url().should('not.contain', `/MVRType/${code}/edit`);
	});
});
