const React = require('react');

const {
	Document,
	Paragraph,
	SystemLifecycle,
	ProductLifecycle,
	ServiceTier,
	Boolean,
	Url,
	Email,
	Default,
} = require('../../../src/templates/components/primitive-components.jsx');

const { render } = require('../../testHelpers/component');

const testComponentProperties = (Component, props) => {
	it('Display of full details', () => {
		const renderedComponent = render(<Component {...props} />);
		expect(renderedComponent).toMatchSnapshot();
	});

	Object.keys(props).forEach(key => {
		it(`Display with no ${key}`, () => {
			const propsWithoutKey = { ...props };
			delete propsWithoutKey[key];
			const renderedComponent = render(
				<Component {...propsWithoutKey} />,
			);
			expect(renderedComponent).toMatchSnapshot();
		});
	});

	it(`Display with no properties`, () => {
		const noProps = {};
		const renderedComponent = render(<Component {...noProps} />);
		expect(renderedComponent).toMatchSnapshot();
	});
};

describe('<Document />', () => {
	testComponentProperties(Document, {
		value: '#heading\n\nparagraph https://biz-ops.com',
	});
});
describe('<Paragraph />', () => {
	testComponentProperties(Paragraph, {
		value: 'some text https://biz-ops.com',
	});
});
describe('<SystemLifecycle />', () => {
	testComponentProperties(SystemLifecycle, { value: 'Production' });
});
describe('<ProductLifecycle />', () => {
	testComponentProperties(ProductLifecycle, { value: 'Incubate' });
});
describe('<ServiceTier />', () => {
	testComponentProperties(ServiceTier, { value: 'Bronze' });
});
describe('<Boolean />', () => {
	testComponentProperties(Boolean, { value: true });
	testComponentProperties(Boolean, { value: false });
});
describe('<Url />', () => {
	testComponentProperties(Url, { value: 'https://biz-ops.com' });
});
describe('<Email />', () => {
	testComponentProperties(Email, { value: 'biz@ops.com' });
});

describe('<Default />', () => {
	testComponentProperties(Default, { value: 'some text' });
});

// describe('<OptionalText />', () => {
// 	testComponentProperties(OptionalText, { label: 'LABEL', value: 'VALUE' });
// });

// describe('<OptionalLink />', () => {
// 	testComponentProperties(OptionalLink, {
// 		label: 'LABEL',
// 		value: 'TARGET',
// 		name: 'NAME',
// 	});
// });

// describe('<Boolean />', () => {
// 	testComponentProperties(Boolean, { label: 'LABEL', value: true });

// 	it('Display of full false details', () => {
// 		const component = render(
// 			<Boolean label="LABEL" value={false} />,
// 		);
// 		expect(component).toMatchSnapshot();
// 	});

// 	it('Display of full rubbish details', () => {
// 		const component = render(
// 			<Boolean label="LABEL" value="rubbish" />,
// 		);
// 		expect(component).toMatchSnapshot();
// 	});
// });

// describe('<Link />', () => {
// 	testComponentProperties(Link, {
// 		label: 'LABEL',
// 		value: 'TARGET',
// 		name: 'NAME',
// 	});
// });

// describe('<Code />', () => {
// 	testComponentProperties(Code, { label: 'LABEL', value: 'VALUE' });
// });

// describe('<ID />', () => {
// 	testComponentProperties(ID, { label: 'LABEL', value: 'VALUE' });
// });

// describe('<Name />', () => {
// 	testComponentProperties(Name, { label: 'LABEL', value: 'VALUE' });
// });

// describe('<Description />', () => {
// 	testComponentProperties(Description, { label: 'LABEL', value: 'VALUE' });
// });

// describe('<Email />', () => {
// 	testComponentProperties(Email, { label: 'LABEL', value: 'VALUE' });
// });

// describe('<EmailLink />', () => {
// 	testComponentProperties(EmailLink, { label: 'LABEL', value: 'VALUE' });
// });

// describe('<Slack />', () => {
// 	testComponentProperties(Slack, { label: 'LABEL', value: 'VALUE' });
// });

// describe('<SlackLink />', () => {
// 	testComponentProperties(SlackLink, { label: 'LABEL', value: 'VALUE' });
// });

// describe('<Phone />', () => {
// 	testComponentProperties(Phone, { label: 'LABEL', value: 'VALUE' });
// });

// describe('<PhoneLink />', () => {
// 	testComponentProperties(PhoneLink, { label: 'LABEL', value: 'VALUE' });
// });

// describe('<LifecycleStage />', () => {
// 	testComponentProperties(LifecycleStage, {
// 		label: 'LABEL',
// 		value: 'Production',
// 	});

// 	it('Display of full Preproduction details', () => {
// 		const component = render(
// 			<LifecycleStage label="LABEL" value="PreProduction" />,
// 		);
// 		expect(component).toMatchSnapshot();
// 	});

// 	it('Display of full rubbish details', () => {
// 		const component = render(
// 			<LifecycleStage label="LABEL" value="rubbish" />,
// 		);
// 		expect(component).toMatchSnapshot();
// 	});
// });

// describe('<PrimaryURL />', () => {
// 	testComponentProperties(PrimaryURL, { label: 'LABEL', value: 'VALUE' });
// });
