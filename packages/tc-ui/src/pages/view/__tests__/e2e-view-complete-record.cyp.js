const { code } = require('../../../test-helpers/mainTypeData.json');
const {
	createType,
	visitMainTypePage,
	visitEditPage,
	populateMainTypeFields,
	save,
	resetDb,
	assertMainTypeFields,
} = require('../../../test-helpers/cypress');

describe('End-to-end - record creation', () => {
	beforeEach(() => {
		resetDb();
	});

	it('can display MainType record', () => {
		cy.wrap().then(() => createType({ code, type: 'MainType' }));
		visitMainTypePage();
		visitEditPage();
		populateMainTypeFields(code);
		save();

		assertMainTypeFields();
	});
});
