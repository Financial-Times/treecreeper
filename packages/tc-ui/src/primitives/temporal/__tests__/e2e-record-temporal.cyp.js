const {
	code,
	someDatetime,
	someDate,
} = require('../../../test-helpers/mainTypeData.json');
const {
	createType,
	visitMainTypePage,
	visitEditPage,
	save,
} = require('../../../test-helpers/cypress');

describe('End-to-end - record Temporal type', () => {
	beforeEach(() => {
		cy.wrap(createType({ code, type: 'MainType' })).then(() => {
			visitMainTypePage();
			visitEditPage();
		});
	});

	it('can record time', () => {
		cy.get('input[name=someTime]')
			.click()
			.then(input => {
				input[0].dispatchEvent(new Event('input', { bubbles: true }));
				input.val('12:15:30Z');
			})
			.click();
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someDate').should('have.text', '12:15:30 PM');
	});

	it('can record date', () => {
		cy.get('input[name=someDate]')
			.click()
			.then(input => {
				input[0].dispatchEvent(new Event('input', { bubbles: true }));
				input.val(someDate);
			})
			.click();
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someDate').should('have.text', '15 January 2020');
	});

	it('can record date-time', () => {
		cy.get('input[name=someDatetime]')
			.click()
			.then(input => {
				input[0].dispatchEvent(new Event('input', { bubbles: true }));
				input.val(someDatetime);
			})
			.click();
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someDatetime').should(
			'have.text',
			'15 January 2020, 1:00:00 PM',
		);
	});
});
