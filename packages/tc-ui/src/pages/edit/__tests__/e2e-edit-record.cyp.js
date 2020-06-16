const {
	code,
	anotherDocument,
	someString,
	anotherString,
	someEnum,
	someDate,
	someDatetime,
} = require('../../../test-helpers/mainTypeData.json');
const {
	createType,
	visitEditPage,
	visitMainTypePage,
	save,
	setLockedRecord,
	visitFieldsetTypePage,
} = require('../../../test-helpers/cypress');

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

	it('can edit string type fields', () => {
		visitEditPage();
		cy.get('input[name=someString]').type(someString);
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#someString').should('have.text', someString);

		visitEditPage();
		cy.get('input[name=someString]').type(` updated`);
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', `${someString} updated`);
	});

	it('can edit document type fields', () => {
		visitEditPage();
		cy.get('textarea[name=anotherDocument]').type(anotherDocument);
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#anotherDocument').should('have.text', anotherDocument);

		visitEditPage();
		cy.get('textarea[name=anotherDocument]').type(` ${anotherString}`);
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#anotherDocument').should(
			'have.text',
			`${anotherDocument} ${anotherString}`,
		);
	});

	it('can edit boolean type fields', () => {
		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);

		visitEditPage();
		cy.get('[type="radio"]')
			.first()
			.check({ force: true });
		save();
		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#someBoolean').should('have.text', 'Yes');

		visitEditPage();
		cy.get('[type="radio"]')
			.eq(1)
			.check({ force: true });
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someBoolean').should('have.text', 'No');
	});

	it('can edit enum type fields', () => {
		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);

		visitEditPage();
		cy.get('select[name=someEnum]').select(someEnum);
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#someEnum').should('have.text', someEnum);

		visitEditPage();
		cy.get('select[name=someEnum]').select(`Third`);
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someEnum').should('have.text', 'Third');
	});

	it('can edit multiple choice type fields', () => {
		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);

		visitEditPage();
		cy.get('#checkbox-someMultipleChoice-First').check({ force: true });
		cy.get('#checkbox-someMultipleChoice-Third').check({ force: true });
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#someMultipleChoice span:first-child').should(
			'have.text',
			'First',
		);
		cy.get('#someMultipleChoice span:last-child').should(
			'have.text',
			'Third',
		);
		cy.get('#someMultipleChoice')
			.children()
			.should('have.length', 2);

		visitEditPage();
		cy.get('#checkbox-someMultipleChoice-Third').uncheck({ force: true });
		cy.get('#checkbox-someMultipleChoice-Second').check({ force: true });
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someMultipleChoice span:first-child').should(
			'have.text',
			'First',
		);
		cy.get('#someMultipleChoice span:last-child').should(
			'have.text',
			'Second',
		);
		cy.get('#someMultipleChoice')
			.children()
			.should('have.length', 2);
	});

	it('can edit date type fields', () => {
		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);

		visitEditPage();
		cy.get('input[name=someDate]')
			.click()
			.then(input => {
				input[0].dispatchEvent(new Event('input', { bubbles: true }));
				input.val(someDate);
			})
			.click();
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someDate').should('have.text', '15 January 2020');

		visitEditPage();

		cy.get('input[name=someDate]')
			.click()
			.then(input => {
				input[0].dispatchEvent(new Event('input', { bubbles: true }));
				input.val('2022-09-12');
			})
			.click();
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someDate').should('have.text', '12 September 2022');
	});

	it('can edit date-time type fields', () => {
		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);

		visitEditPage();
		cy.get('input[name=someDatetime]')
			.click()
			.then(input => {
				input[0].dispatchEvent(new Event('input', { bubbles: true }));
				input.val(someDatetime);
			})
			.click();
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someDatetime').should(
			'have.text',
			'15 January 2020, 1:00:00 PM',
		);

		visitEditPage();

		cy.get('input[name=someDatetime]')
			.click()
			.then(input => {
				input[0].dispatchEvent(new Event('input', { bubbles: true }));
				input.val('2022-11-12T19:00');
			})
			.click();
		save();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#code').should('have.text', code);
		cy.get('#someDatetime').should(
			'have.text',
			'12 November 2022, 7:00:00 PM',
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
