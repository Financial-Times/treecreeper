// const schema = require('@financial-times/tc-schema-sdk');
// const React = require('react');
// require('../../../src/lib/configure-schema');

// const {
// 	BizOpsLink,
// 	BizOpsLinks,
// } = require('../../../src/templates/components/primitive-components.jsx');

// const { render } = require('../../testHelpers/component');

// describe('Biz Ops Links', () => {
// 	beforeAll(() => schema.refresh());
// 	describe('<BizOpsLink />', () => {
// 		it('Display a fully specified link', () => {
// 			const component = render(
// 				<BizOpsLink
// 					type="System"
// 					value={{ code: 'a-code', name: 'a-name' }}
// 				/>,
// 			);
// 			expect(component).toMatchSnapshot();
// 		});

// 		it('Display a link with no name', () => {
// 			const component = render(
// 				<BizOpsLink type="System" value={{ code: 'a-code' }} />,
// 			);
// 			expect(component).toMatchSnapshot();
// 		});

// 		it('Display a link with no code', () => {
// 			const component = render(
// 				<BizOpsLink type="System" value={{ name: 'a-name' }} />,
// 			);
// 			expect(component).toMatchSnapshot();
// 		});

// 		it('Display a link with no code or name', () => {
// 			const component = render(<BizOpsLink type="System" />);
// 			expect(component).toMatchSnapshot();
// 		});
// 	});

// 	const baseObject = () => ({
// 		list01: [
// 			{ code: 'code01', name: 'name01' },
// 			{ code: 'code02', name: 'name02' },
// 			{ code: 'code03', name: 'name03' },
// 			{ code: 'code04', name: 'name04' },
// 			{ code: 'code05', name: 'name05' },
// 		],
// 	});

// 	describe('<BizOpsLinks />', () => {
// 		it('Display a fully specified list', () => {
// 			const props = baseObject();
// 			const component = render(
// 				<BizOpsLinks
// 					type="System"
// 					label="a-label"
// 					value={props.list01}
// 				/>,
// 			);
// 			expect(component).toMatchSnapshot();
// 		});

// 		it('Display a link with no list', () => {
// 			const component = render(
// 				<BizOpsLinks type="System" label="a-label" />,
// 			);
// 			expect(component).toMatchSnapshot();
// 		});

// 		it('Display a link with no label', () => {
// 			const props = baseObject();
// 			const component = render(
// 				<BizOpsLinks type="System" value={props.list01} />,
// 			);
// 			expect(component).toMatchSnapshot();
// 		});

// 		it('Display a link with no list content', () => {
// 			const props = {};
// 			const component = render(
// 				<BizOpsLinks type="System" value={props} />,
// 			);
// 			expect(component).toMatchSnapshot();
// 		});
// 	});
// });
