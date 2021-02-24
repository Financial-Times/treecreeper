/* eslint-disable cypress/no-unnecessary-waiting */
const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-create-record';
const code = `${namespace}-code`;

const save = () =>
	cy.get('[data-button-type="submit"]').click({
		force: true,
	});

describe('End-to-end - record creation', () => {
	before(() => {
		cy.wrap(dropFixtures(namespace));
	});
	afterEach(() => {
		cy.wrap(dropFixtures(namespace));
	});

	it('can create a record', () => {
		cy.visit(`/PropertiesTest/create`);

		cy.get('input[name="code"]').type(code);
		save();

		cy.url().should(
			'contain',
			`PropertiesTest/${code}?message=PropertiesTest%20${code}%20was%20successfully%20created&message`,
		);
	});

	it('errors when creating duplicate record, but preserves data', () => {
		cy.wrap(executeQuery(`CREATE (:PropertiesTest {code: "${code}"})`));
		cy.visit(`/PropertiesTest/create`);

		cy.get('input[name="code"]').type(code);
		cy.get('input[name="firstStringProperty"]').type('some text');
		save();

		cy.url().should('contain', 'PropertiesTest/create');

		cy.get('.o-message__content-main').should(
			'contain',
			`Oops. Could not create PropertiesTest record for ${code}`,
		);
		cy.get('.o-message__content-additional').should(
			'contain',
			`PropertiesTest ${code} already exists`,
		);
		cy.get('input[name="code"]').should('have.value', code);
		cy.get('input[name="firstStringProperty"]').should(
			'have.value',
			'some text',
		);
	});

	it('useInSummary does not hide properties', () => {
		cy.visit(`/PropertiesTest/create`);

		cy.get('input[name="secondStringProperty"]').should('exist');
	});

	it('does not submit entire form when relationship input selection using Enter key press', () => {
		cy.wrap(
			executeQuery(
				`CREATE (a:RelationshipTestsMany {code: "${code}-many"})`,
			),
		);

		cy.visit(`/RelationshipTestsOne/create`);

		cy.get('input[name=code]').type(code);
		cy.get('#simpleRelationship-picker') // eslint-disable-line cypress/no-unnecessary-waiting
			.type(code)
			.wait(500)
			.type('{enter}');

		cy.get(`[data-code="${code}-many"]`).should('contain', `${code}-many`);

		cy.url().should('contain', `RelationshipTestsOne/create`);

		save();

		cy.url().should(
			'contain',
			`RelationshipTestsOne/${code}?message=RelationshipTestsOne%20${code}%20was%20successfully%20created&message`,
		);
	});

	it('fieldsets used on create screen', () => {
		cy.visit(`/FieldsetType/create`);
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
		cy.visit(`/LockedFieldTest/create`);
		cy.get('input[name=code]').type(code);
		cy.get('input[name=lockedField]').should('not.exist');
		cy.get('input[name=lockedField-disabled]').should('be.disabled');
		save();
		cy.url().should(
			'contain',
			`LockedFieldTest/${code}?message=LockedFieldTest%20${code}%20was%20successfully%20created&message`,
		);
	});

	describe('Minimum Viable Records', () => {
		beforeEach(() => {
			cy.wrap(
				executeQuery(`CREATE (a:MVRTypeChild {code: "${code}-child"})`),
			);
		});
		const populate = skip => {
			cy.get('input[name=code]').type(code);
			skip === 'string' ||
				cy.get('input[name=stringProperty]').type('a string');
			skip === 'boolean' ||
				cy.get('input#radio-booleanProperty-No').check({ force: true });
			skip === 'number' || cy.get('input[name=numberProperty]').type(0);
			// skip === 'multipleChoiceEnum' || cy.get('input#checkbox-multipleChoiceEnumProperty-First').check({force: true})

			skip === 'relationship' ||
				cy
					.get('#relationshipProperty-picker')
					.type('e2e')
					.wait(500)
					.type('{enter}');
		};
		it('can create record when MBVR fields are all filled', () => {
			cy.visit(`/MVRType/create`);
			populate();
			save();
			cy.url().should('contain', `/MVRType/${code}`);
		});
		it('can not create record if string is missing', () => {
			cy.visit(`/MVRType/create`, {
				onBeforeLoad(win) {
					cy.stub(win, 'prompt');
				},
			});
			populate('string');
			save();
			cy.window()
				.its('prompt')
				.should(
					'be.calledWith',
					'Please fill out all fields required for the minimum viable record before creating a new record.\nType SAVE INCOMPLETE RECORD below to proceed, or click cancel to return to the form',
				);
			cy.url().should('contain', `/MVRType/create`);
		});
		it('can not create record if boolean is missing', () => {
			cy.visit(`/MVRType/create`, {
				onBeforeLoad(win) {
					cy.stub(win, 'prompt');
				},
			});
			populate('boolean');
			save();
			cy.window()
				.its('prompt')
				.should(
					'be.calledWith',
					'Please fill out all fields required for the minimum viable record before creating a new record.\nType SAVE INCOMPLETE RECORD below to proceed, or click cancel to return to the form',
				);
			cy.url().should('contain', `/MVRType/create`);
		});
		it('can not create record if number is missing', () => {
			cy.visit(`/MVRType/create`, {
				onBeforeLoad(win) {
					cy.stub(win, 'prompt');
				},
			});
			populate('number');
			save();
			cy.window()
				.its('prompt')
				.should(
					'be.calledWith',
					'Please fill out all fields required for the minimum viable record before creating a new record.\nType SAVE INCOMPLETE RECORD below to proceed, or click cancel to return to the form',
				);
			cy.url().should('contain', `/MVRType/create`);
		});
		it('can not create record if relationship is missing', () => {
			cy.visit(`/MVRType/create`, {
				onBeforeLoad(win) {
					cy.stub(win, 'prompt');
				},
			});
			populate('relationship');
			save();
			cy.window()
				.its('prompt')
				.should(
					'be.calledWith',
					'Please fill out all fields required for the minimum viable record before creating a new record.\nType SAVE INCOMPLETE RECORD below to proceed, or click cancel to return to the form',
				);
			cy.url().should('contain', `/MVRType/create`);
		});
		it('can create record with incomplete fields with "SAVE INCOMPLETE RECORD" option', () => {
			cy.visit(`/MVRType/create`, {
				onBeforeLoad(win) {
					cy.stub(win, 'prompt').returns('SAVE INCOMPLETE RECORD');
				},
			});
			populate('string');
			save();
			cy.url().should('contain', `/MVRType/${code}`);
			cy.get('#code').should('have.text', code);
			cy.get('#stringProperty').should('not.exist');
		});
	});
});
