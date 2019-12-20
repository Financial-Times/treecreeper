// const React = require('react');
// const schema = require('@financial-times/tc-schema-sdk');
// require('../../../src/lib/configure-schema');
// const {
// 	EditText,
// 	EditTextArea,
// 	EditDropdown,
// 	EditBoolean,
// 	EditDateTime,
// } = require('../../../src/templates/components/edit-components');

// const { render } = require('../../testHelpers/component');

// const sharedPropsWithValue = {
// 	propertyName: 'PROPERTY NAME',
// 	value: 'VALUE',
// 	template: 'EditText',
// 	dataType: 'DATA TYPE',
// 	options: [],
// 	type: 'SystemLifecycle',
// 	label: 'LABEL',
// 	description: 'DESCRIPTION',
// };

// const sharedPropsNoValue = {
// 	propertyName: 'PROPERTY NAME',
// 	value: '',
// 	template: 'EditText',
// 	dataType: 'DATA TYPE',
// 	options: [],
// 	type: 'SystemLifecycle',
// 	label: 'LABEL',
// 	description: 'DESCRIPTION',
// };

// const testComponentProperties = (testCase, Component, props) => {
// 	it(`Should display a populated ${testCase} element with values`, () => {
// 		const renderedComponent = render(<Component {...props} />);
// 		expect(renderedComponent).toMatchSnapshot();
// 	});

// 	it(`Should display a blank ${testCase} element with no values`, () => {
// 		props = sharedPropsNoValue;
// 		const renderedComponent = render(<Component {...props} />);
// 		expect(renderedComponent).toMatchSnapshot();
// 	});
// };
// describe('edit components', () => {
// 	beforeAll(() => schema.refresh());

// 	describe('<EditText />', () => {
// 		testComponentProperties('EditText', EditText, sharedPropsWithValue);
// 	});

// 	describe('<EditTextArea />', () => {
// 		testComponentProperties(
// 			'EditTextArea',
// 			EditTextArea,
// 			sharedPropsWithValue,
// 		);
// 	});

// 	describe('<EditDropdown />', () => {
// 		testComponentProperties(
// 			'EditDropdown',
// 			EditDropdown,
// 			sharedPropsWithValue,
// 		);

// 		it(`Should render an EditDropdown element with a set of options`, () => {
// 			const propsWithOptions = {
// 				propertyName: 'PROPERTY NAME',
// 				value: 'VALUE',
// 				template: 'EditText',
// 				dataType: 'DATA TYPE',
// 				options: ["Don't know", 'Option 1', 'Option 2'],
// 				type: 'SystemLifecycle',
// 				label: 'LABEL',
// 				description: 'DESCRIPTION',
// 			};
// 			const component = render(<EditDropdown {...propsWithOptions} />);
// 			expect(component).toMatchSnapshot();
// 		});
// 	});

// 	describe('<EditDateTime />', () => {
// 		it('returns date value (default)', () => {
// 			const sharedPropsWithDateValue = {
// 				propertyName: 'PROPERTY NAME',
// 				value: { formatted: '2019-01-25T15:47:20.015000000Z' },
// 				template: 'EditText',
// 				dataType: 'DATA TYPE',
// 				options: [],
// 				type: 'Date',
// 				label: 'LABEL',
// 				description: 'DESCRIPTION',
// 			};
// 			const component = render(
// 				<EditDateTime {...sharedPropsWithDateValue} />,
// 			);
// 			expect(component).toMatchSnapshot();
// 		});

// 		it('returns time value', () => {
// 			const sharedPropsWithTimeValue = {
// 				propertyName: 'PROPERTY NAME',
// 				value: { formatted: '21:00' },
// 				template: 'EditText',
// 				dataType: 'DATA TYPE',
// 				options: [],
// 				type: 'Time',
// 				label: 'LABEL',
// 				description: 'DESCRIPTION',
// 			};
// 			const component = render(
// 				<EditDateTime {...sharedPropsWithTimeValue} />,
// 			);
// 			expect(component).toMatchSnapshot();
// 		});

// 		it('returns date and time value', () => {
// 			const sharedPropsWithDateTimeValue = {
// 				propertyName: 'PROPERTY NAME',
// 				value: { formatted: '2019-01-25T15:47:20.015000000Z' },
// 				template: 'EditText',
// 				dataType: 'DATA TYPE',
// 				options: [],
// 				type: 'DateTime',
// 				label: 'LABEL',
// 				description: 'DESCRIPTION',
// 			};
// 			const component = render(
// 				<EditDateTime {...sharedPropsWithDateTimeValue} />,
// 			);
// 			expect(component).toMatchSnapshot();
// 		});
// 	});

// 	describe('<EditBoolean />', () => {
// 		testComponentProperties(
// 			'EditBoolean',
// 			EditBoolean,
// 			sharedPropsWithValue,
// 		);
// 	});
// });
