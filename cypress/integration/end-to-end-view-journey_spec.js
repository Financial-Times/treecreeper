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
		.wait(500)
		.type('{downarrow}{enter}');
	cy.get('#isCuriousParentOf-picker')
		.type('e2e')
		.wait(500)
		.type('{downarrow}{enter}');

	cy.get('[data-testid="submit"]').click();
};

const populateChildTypeFields = () => {
	cy.get('#id-code').type('e2e-demo-child');
	cy.get('#isChildOf-picker')
		.type('e2e')
		.wait(500)
		.type('{downarrow}{enter}');
	cy.get('#isCuriousChildOf-picker')
		.type('e2e')
		.wait(500)
		.type('{downarrow}{enter}');
	cy.get('[data-testid="submit"]').click();
};

describe('End-to-end Journey', () => {
	before(() => {
		cy.visit(`/MainType/create`);
		cy.url().should('contain', '/MainType/create');

		populateMainTypeFields();

		cy.get('[data-testid="submit"]').click();
	});

	it('Navigates through MainType/create', () => {
		cy.visit(`/MainType/e2e-demo`);
		cy.url().should('contain', '/MainType/e2e-demo');

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
		cy.url().should('contain', '/ParentType/create');

		populateParentTypeFields();

		cy.visit(`/ParentType/e2e-demo-parent`);
		cy.url().should('contain', '/ParentType/e2e-demo-parent');

		cy.get('#code').should('have.text', `${code}-parent`);
		cy.get('#isParentOf')
			.find('a')
			.should('have.text', code)
			.url(`/MainType/${code}`);
		cy.get('#isCuriousParentOf')
			.find('a')
			.should('have.text', code)
			.url(`/MainType/${code}`);

		cy.visit(`/MainType/e2e-demo`);
		cy.url().should('contain', '/MainType/e2e-demo');

		cy.get('#parents')
			.find('a')
			.should('have.text', `${code}-parent`)
			.url(`/ParentType/${code}-parent`);
		cy.get('#curiousParent')
			.find('a')
			.should('have.text', `${code}-parent`)
			.url(`/ParentType/${code}-parent`);
		cy.get('#curiousParent')
			.find('a')
			.click({ force: true });

		cy.location('pathname').should('eq', `/ParentType/${code}-parent`);
	});

	it.only('Navigates through ChildType/create and creates ChildType', () => {
		cy.visit(`/ChildType/create`);
		cy.url().should('contain', '/ChildType/create');

		populateChildTypeFields();

		cy.visit(`/ChildType/e2e-demo-child`);
		cy.url().should('contain', '/ChildType/e2e-demo-child');

		cy.get('#code').should('have.text', `${code}-child`);
		cy.get('#isChildOf')
			.find('a')
			.should('have.text', code)
			.url(`/MainType/${code}`);
		cy.get('#isCuriousChildOf')
			.find('a')
			.should('have.text', code)
			.url(`/MainType/${code}`);

		cy.visit(`/MainType/e2e-demo`);
		cy.url().should('contain', '/MainType/e2e-demo');

		cy.get('#children')
			.find('a')
			.should('have.text', `${code}-child`)
			.url(`/ChildType/${code}-child`);
		cy.get('#curiousChild')
			.should('have.text', `${code}-child`)
			.url(`/ChildType/${code}-child`);
		cy.get('#curiousChild').click({ force: true });

		cy.location('pathname').should('eq', `/ChildType/${code}-child`);
	});
});
