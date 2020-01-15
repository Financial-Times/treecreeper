const { dropFixtures } = require('../../test-helpers/test-fixtures');

describe('End-to-end Journey', () => {
	const namespace = `e2e-demo`;

	const resetDb = async () => {
		await dropFixtures(namespace);
	};

	before(() => {
		resetDb();

		cy.visit(`/MainType/create`);
		cy.get('input[name=code]').type('e2e-demo');
		cy.get('textarea[name=someDocument]').type(
			`Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.`,
		);
		cy.get('textarea[name=anotherDocument]').type(
			`Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old.`,
		);
		cy.get('input[name=someString]').type('Lorem ipsum dolor sit amet');
		cy.get('[type="radio"]')
			.first()
			.check({ force: true });
		cy.get('select[name=someEnum]').select('Second');
		cy.get('input[name=someInteger]').type(2020);
		cy.get('input[name=anotherString]').type(
			'There are many variations of passages of Lorem Ipsum',
		);
		cy.get('input[name=someDate]')
			.click()
			.then(input => {
				input[0].dispatchEvent(new Event('input', { bubbles: true }));
				input.val('2020-01-15');
			})
			.click();
		cy.get('input[name=someDatetime]')
			.click()
			.then(input => {
				input[0].dispatchEvent(new Event('input', { bubbles: true }));
				input.val('2020-01-15T13:00');
			})
			.click();
		cy.get('input[name=someUrl]').type('https://google.com');

		cy.get('[data-testid="submit"]').click();
	});

	it('Navigates through an end-to-end journey for creating MainType', () => {
		cy.visit(`/MainType/e2e-demo`);
	});
});
