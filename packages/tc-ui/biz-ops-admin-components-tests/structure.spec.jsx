const React = require('react');

const {
	SectionHeader,
} = require('../../../src/templates/components/structure.jsx');

const { render } = require('../../testHelpers/component');

describe('<SectionHeader />', () => {
	it('Display of title and edit button', () => {
		const component = render(
			<SectionHeader title="A Nice Title Wth Edit" code="code" />,
		);
		expect(component).toMatchSnapshot();
	});

	it('Display of just title', () => {
		const component = render(<SectionHeader title="Just A Nice Title" />);
		expect(component).toMatchSnapshot();
	});

	it('Display with no details', () => {
		const component = render(<SectionHeader />);
		expect(component).toMatchSnapshot();
	});
});
