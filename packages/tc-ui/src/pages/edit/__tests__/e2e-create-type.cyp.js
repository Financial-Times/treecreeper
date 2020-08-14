const {
	code,
	someString,
	promptText,
} = require('../../../test-helpers/mainTypeData.json');
const {
	createType,
	visitMainTypePage,
	visitEditPage,
	populateMinimumViableFields,
	populateMainTypeFields,
	assertMainTypeFields,
	save,
	resetDb,
	createMainTypeRecordWithParentsAndChildren,
} = require('../../../test-helpers/cypress');

describe('End-to-end - record creation', () => {
	beforeEach(() => {
		resetDb();
	});

	describe('MVRType', () => {
		it('can create MVRType record', () => {
			populateMinimumViableFields(code);
			save();
			cy.url().should('contain', `/MVRType/${code}`);
			cy.get('#record-title a span:first-child').should(
				'have.text',
				'MVRType: e2e-demo',
			);
		});
		it('can not create record if no code(label) is given', () => {
			cy.visit(`/MVRType/create`, {
				onBeforeLoad(win) {
					cy.stub(win, 'prompt');
				},
			});
			save();
			// required field
			cy.get('input:invalid').should('have.length', 1);
		});
		it('can not create record if description is not given', () => {
			cy.visit(`/MVRType/create`, {
				onBeforeLoad(win) {
					cy.stub(win, 'prompt');
				},
			});
			cy.get('#id-code').type(code);
			save();
			cy.window().its('prompt').should('called', 1);
			cy.window().its('prompt.args.0').should('deep.eq', [promptText]);
		});
		it('can not create record if child record is not selected', () => {
			cy.visit(`/MVRType/create`, {
				onBeforeLoad(win) {
					cy.stub(win, 'prompt');
				},
			});
			cy.get('#id-code').type(code);
			cy.get('#id-someString').type(someString);
			save();
			cy.window().its('prompt').should('called', 1);
			cy.window().its('prompt.args.0').should('deep.eq', [promptText]);
		});
		it('can create record with incomplete fields with "SAVE INCOMPLETE RECORD" option', () => {
			cy.visit(`/MVRType/create`, {
				onBeforeLoad(win) {
					cy.stub(win, 'prompt').returns('SAVE INCOMPLETE RECORD');
				},
			});
			cy.get('#id-code').type(code);
			save();
			cy.url().should('contain', `/MVRType/${code}`);
			cy.get('#code').should('have.text', code);
			cy.get('#someString').should('be.empty');
			cy.get('#children').should('not.exist');
		});
	});

	describe('MainType', () => {
		it('can create MainType record', () => {
			cy.visit(`/MainType/create`);

			cy.get('input[name=code]').type(code);
			populateMainTypeFields();
			save();

			assertMainTypeFields();
		});

		it('can create MainType record with parents and children relationships', () => {
			cy.wrap().then(() =>
				createMainTypeRecordWithParentsAndChildren(code, {
					parent1: `${code}-parent-one`,
					parent2: `${code}-parent-two`,
					firstChild: `${code}-first-child`,
					secondChild: `${code}-second-child`,
				}),
			);

			visitMainTypePage();
			visitEditPage();
			populateMainTypeFields();
			save();

			assertMainTypeFields();
			cy.get('#children li').then(children => {
				cy.wrap(children)
					.eq(0)
					.find('a')
					.should('have.text', `${code}-first-child`)
					.should(
						'have.attr',
						'href',
						`/ChildType/${code}-first-child`,
					);

				cy.wrap(children)
					.eq(1)
					.find('a')
					.should('have.text', `${code}-second-child`)
					.should(
						'have.attr',
						'href',
						`/ChildType/${code}-second-child`,
					);
			});

			cy.get('#parents li').then(parent => {
				cy.wrap(parent)
					.eq(0)
					.find('a')
					.should('have.text', `${code}-parent-one`)
					.should(
						'have.attr',
						'href',
						`/ParentType/${code}-parent-one`,
					);

				cy.wrap(parent)
					.eq(1)
					.find('a')
					.should('have.text', `${code}-parent-two`)
					.should(
						'have.attr',
						'href',
						`/ParentType/${code}-parent-two`,
					);
			});
		});
		it('does not submit entire form when relationship input selection using Enter key press', () => {
			createType({
				code: `${code}-first-child`,
				type: 'ChildType',
			});

			cy.visit(`/MainType/create`);

			cy.get('input[name=code]').type(code);
			cy.get('#children-picker') // eslint-disable-line cypress/no-unnecessary-waiting
				.type(code)
				.wait(500)
				.type('{enter}');

			cy.get('[data-code="e2e-demo-first-child"]').should(
				'contain',
				`${code}-first-child`,
			);

			cy.url().should('contain', `MainType/create`);

			save();

			cy.url().should(
				'contain',
				`MainType/e2e-demo?message=MainType%20e2e-demo%20was%20successfully%20updated&message`,
			);

			cy.get('#children').should('have.length', 1);
		});
	});
	describe('Fieldset displays when creating type', () => {
		beforeEach(() => {
			cy.visit(`/FieldsetType/create`);
		});
		it('displays fieldset heading for fieldsets', () => {
			cy.get('.fieldset-fieldsetA').should('exist');
			cy.get('#fieldset-a').contains('Fieldset A');
			cy.get('.fieldset-fieldsetB').should('exist');
			cy.get('#fieldset-b').contains('Fieldset B');
		});

		it('displays fieldset description when provided for fieldsets', () => {
			cy.get('.fieldset-fieldsetB-description').should('exist');
			cy.get('.fieldset-fieldsetB-description').should(
				'have.text',
				'I have a lovely description.',
			);
			cy.get('.fieldset-fieldsetA-description').should('exist');
			cy.get('.fieldset-fieldsetA-description').should('have.text', '');
		});
	});
});
