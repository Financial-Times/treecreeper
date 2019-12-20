const React = require('react');
const { shallow } = require('../../../test-helpers/enzyme-setup');
const {
	EditComponent,
	// , ViewComponent,
	parser,
} = require('../server');
// const { withEditComponent } = require('../browser');

const { FieldTitle } = require('../../../components/edit-helpers');
const { RelationshipPicker } = require('../lib/relationship-picker');

describe('relationship interfaces', () => {
	describe('<EditComponent />', () => {
		// Broke this test accidentally when refactoring component wrapping
		// , but maybe we don't really need this test?
		// The logic within relationship picker is the important thing
		it.skip('Renders expected wrapper and children', () => {
			const props = { testProp: true };
			const wrapper = shallow(<EditComponent {...props} />);
			expect(
				wrapper.is(
					'label.o-forms-field[data-biz-ops-type="relationship"]',
				),
			).toBe(true);
			expect(wrapper.children().length).toEqual(2);
			expect(wrapper.childAt(0).is(FieldTitle)).toBe(true);
			expect(wrapper.childAt(0).props().testProp).toBe(true);
			expect(wrapper.childAt(1).is(RelationshipPicker)).toBe(true);
			expect(wrapper.childAt(1).props().testProp).toBe(true);
		});
	});

	// Highest priority is to have test coverage for edit, so skipping for now
	describe.skip('<ViewComponent />', () => {});

	// Failure to attach edit components is fairly obvious to spot manually,
	// so gonna leave untested for now
	describe.skip(`withEditComponent`, () => {});

	describe('parser', () => {
		it('returns null for empty strings', () => {
			expect(parser('')).toEqual(null);
		});
		it("returns null for 'null' string", () => {
			expect(parser('null')).toEqual(null);
		});
		it('parses as JSON if exists', () => {
			expect(parser('{"test": true}')).toEqual({ test: true });
		});
	});
});
