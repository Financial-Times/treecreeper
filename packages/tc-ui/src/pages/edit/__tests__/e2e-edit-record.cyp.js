const { code } = require('../../../test-helpers/mainTypeData.json');
const {
	createType,
	visitEditPage,
	visitMainTypePage,
	save,
	setLockedRecord,
	visitFieldsetTypePage,
} = require('../../../test-helpers/cypress');

// disable based on lockedness of record
// disable based on locked in schema
// hides deprecated fields
// hides @cypher fields

describe('End-to-end - edit record', () => {
	beforeEach(() => {
		cy.wrap(createType({ code, type: 'MainType' })).then(() =>
			visitMainTypePage(),
		);
	});

	it('can not edit code of record', () => {
		visitEditPage();
		cy.get('input[name=code]').type('-test');
		save();

		cy.url().should('contain', `/MainType/${code}/edit`);
		cy.get('.o-message__content-main').should(
			'contain',
			'Oops. Could not update MainType record for e2e-demo.',
		);
		cy.get('.o-message__content-additional').should(
			'contain',
			`Conflicting code property \`e2e-demo-test\` in payload for MainType e2e-demo`,
		);
	});

	it('can save record with locked fields', () => {
		cy.wrap().then(() => setLockedRecord(code));
		visitEditPage();
		cy.get('#id-lockedField').should('have.value', 'locked value 1');
		cy.get('#id-someString').should('have.value', 'locked value 2');
		cy.get('#radio-someBoolean-Yes').should('be.checked');
		save();
		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#lockedField').should('have.text', 'locked value 1');
		cy.get('#someString').should('have.text', 'locked value 2');
		cy.get('#someBoolean').should('have.text', 'Yes');
	});

	// see /demo/cms/components/primitives.jsx for where this component is passed in
	it('renders an additional edit component with full record data', () => {
		visitEditPage();

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
			'This value: e2e-demo',
		);
	});
	describe('Fieldset display', () => {
		beforeEach(() => {
			cy.wrap(
				createType({
					code: 'Fieldset-demo',
					type: 'FieldsetType',
				}),
			).then(() => visitFieldsetTypePage('Fieldset-demo'));
		});
		describe('view mode', () => {
			it('displays fieldset heading for fieldsets', () => {
				cy.get('.fieldset-fieldsetA').should('exist');
				cy.get('#fieldset-a').should('have.text', 'Fieldset A');
				cy.get('.fieldset-fieldsetB').should('exist');
				cy.get('#fieldset-b').should('have.text', 'Fieldset B');
			});

			it('displays fieldset description when provided for fieldsets', () => {
				cy.get('.fieldset-fieldsetB-description').should('exist');
				cy.get('.fieldset-fieldsetB-description').should(
					'have.text',
					'I have a lovely description.',
				);
				cy.get('.fieldset-fieldsetA-description').should('exist');
				cy.get('.fieldset-fieldsetA-description').should(
					'have.text',
					'',
				);
			});
		});
		describe('edit mode', () => {
			it('displays fieldset heading for fieldsets', () => {
				visitEditPage();
				cy.get('.fieldset-fieldsetA').should('exist');
				cy.get('#fieldset-a').contains('Fieldset A');
				cy.get('.fieldset-fieldsetB').should('exist');
				cy.get('#fieldset-b').contains('Fieldset B');
			});
			it('displays fieldset description when provided for fieldsets', () => {
				visitEditPage();

				cy.get('.fieldset-fieldsetB-description').should('exist');
				cy.get('.fieldset-fieldsetB-description').should(
					'have.text',
					'I have a lovely description.',
				);
				cy.get('.fieldset-fieldsetA-description').should('exist');
				cy.get('.fieldset-fieldsetA-description').should(
					'have.text',
					'',
				);
			});
		});
	});
});
