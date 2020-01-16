const { dropFixtures } = require('../../test-helpers/test-fixtures');
const {
	code,
	someDocument,
	anotherDocument,
	someString,
	someEnum,
	someInteger,
	anotherString,
	someDate,
	someDatetime,
	someUrl,
} = require('../fixtures/mainTypeData.json');

describe('End-to-end Journey', () => {
	const resetDb = async () => {
		await dropFixtures(code);
	};

	const populateMainTypeFields = () => {
		cy.visit(`/MainType/create`);

		cy.get('input[name=code]').type(code);
		cy.get('textarea[name=someDocument]').type(someDocument);
		cy.get('textarea[name=anotherDocument]').type(anotherDocument);
		cy.get('input[name=someString]').type(someString);
		cy.get('[type="radio"]')
			.first()
			.check({ force: true });
		cy.get('select[name=someEnum]').select(someEnum);
		cy.get('input[name=someInteger]').type(someInteger);
		cy.get('input[name=anotherString]').type(anotherString);
		cy.get('input[name=someDate]')
			.click()
			.then(input => {
				input[0].dispatchEvent(new Event('input', { bubbles: true }));
				input.val(someDate);
			})
			.click();
		cy.get('input[name=someDatetime]')
			.click()
			.then(input => {
				input[0].dispatchEvent(new Event('input', { bubbles: true }));
				input.val(someDatetime);
			})
			.click();
		cy.get('input[name=someUrl]').type(someUrl);
	};

	const populateParentTypeFields = () => {
		cy.get('#id-code').type('e2e-demo-parent');
		cy.get('#isParentOf-picker')
			.type('e2e')
			.type('{downarrow}{enter}');
		cy.get('#isCuriousParentOf-picker')
			.type('e2e')
			.type('{downarrow}{enter}');
	};

	const populateChildTypeFields = () => {
		cy.get('#id-code').type('e2e-demo-child');
		cy.get('#isChildOf-picker')
			.type('e2e')
			.type('{downarrow}{enter}');
		cy.get('#isCuriousChildOf-picker')
			.type('e2e')
			.type('{downarrow}{enter}');
	};

	before(() => {
		resetDb();
	});

	it('Navigates through MainType/create and creates MainType', () => {
		cy.visit(`/MainType/create`);
		populateMainTypeFields();

		cy.get('[data-testid="submit"]').click();

		cy.visit(`/MainType/e2e-demo`);

		cy.get('#code').should('have.text', code);
		cy.get('#someDocument').should('have.text', someDocument);
		cy.get('#anotherDocument').should('have.text', anotherDocument);
		cy.get('#someString').should('have.text', someString);
		cy.get('#someBoolean').should('have.text', 'Yes');
		cy.get('#someEnum').should('have.text', someEnum);
		cy.get('#someInteger').should('have.text', String(someInteger));
		cy.get('#anotherString').should('have.text', anotherString);
		cy.get('#someDate').should('have.text', '15 January 2020');
		cy.get('#someDatetime').should(
			'have.text',
			'15 January 2020, 1:00:00 PM',
		);
		cy.get('#someUrl').should('have.text', someUrl);
	});

	it('Navigates through ParentType/create and creates ParentType', () => {
		cy.visit(`/ParentType/create`);
		populateParentTypeFields();

		cy.get('[data-testid="submit"]').click();

		cy.visit(`/ParentType/e2e-demo-parent`);

		cy.get('#code').should('have.text', `${code}-parent`);
		cy.get('#isParentOf')
			.find('a')
			.should('have.text', code)
			.url(`/MainType/${code}`);
		cy.get('#isCuriousParentOf')
			.find('a')
			.should('have.text', code)
			.url(`/MainType/${code}`);
	});

	it('Navigates through ChildType/create and creates ChildType', () => {
		cy.visit(`/ChildType/create`);
		populateChildTypeFields();

		cy.get('[data-testid="submit"]').click();

		cy.visit(`/ChildType/e2e-demo-child`);

		cy.get('#code').should('have.text', `${code}-child`);
		cy.get('#isChildOf')
			.find('a')
			.should('have.text', code)
			.url(`/MainType/${code}`);
		cy.get('#isCuriousChildOf')
			.find('a')
			.should('have.text', code)
			.url(`/MainType/${code}`);
	});

	it('creates relationships between MainType, ParentType and ChildType', () => {
		cy.visit(`/MainType/e2e-demo`);

		cy.get('#children').should('have.text', `${code}-child`);
		cy.get('#parents').should('have.text', `${code}-parent`);
		cy.get('#curiousChild').should('have.text', `${code}-child`);
		cy.get('#curiousParent').should('have.text', `${code}-parent`);
	});
});
