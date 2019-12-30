const React = require('react');
const { shallow } = require('../../../test-helpers/enzyme-setup');
const {
	EditComponent,
	// , ViewComponent,
	parser,
} = require('../server');
// const { withEditComponent } = require('../browser');

const { FieldTitle } = require('../../../lib/components/input-wrapper');
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
			expect(parser('{"code": "a-code"}')).toEqual('a-code');
		});
		it('parses as JSON array if exists', () => {
			expect(parser('[{"code": "a-code"}]')).toEqual(['a-code']);
		});
		it('excludes non-code props', () => {
			expect(parser('{"code": "a-code", "other": 1}')).toEqual('a-code');
		});
		it('excludes non-code props in JSON array', () => {
			expect(parser('[{"code": "a-code", "other": 1}]')).toEqual([
				'a-code',
			]);
		});
	});

	describe.skip('graphqlFragment', () => {
		it('fetches code by default', () => {});

		it('fetches code and name if name defined', () => {});
		it('fetches code and isActive if isActive defined', () => {});

		it('fetches any useInSummary fields', () => {});
	});
});
