const React = require('react');
// bizarely we get a fetch not found error unless this require is included
// Something odd with mocking of fetch

const ReactAutosuggest = require('react-autosuggest');
const fetchMock = require('fetch-mock');
const { shallow, mount } = require('../../../../test-helpers/enzyme-setup');

Object.assign(fetchMock.config, {
	fetch: global.fetch,
	Request: global.Request,
	Response: global.Response,
	Headers: global.Headers,
});

const { RelationshipPicker } = require('../relationship-picker');
const { Relationship } = require('../relationship');

const getAutoSuggest = wrapper => wrapper.find(ReactAutosuggest).first();
const getRelationshipList = wrapper =>
	wrapper.find('ul.relationship-editor__list').first();

const getHiddenInput = wrapper => wrapper.find('input[type="hidden"]').first();

describe('relationship picker', () => {
	describe('initial states', () => {
		it("Can render the 'furniture'", () => {
			const props = { propertyName: 'testProperty' };
			const wrapper = shallow(<RelationshipPicker {...props} />);
			expect(
				wrapper.is('div[data-component="relationship-picker"]'),
			).toBe(true);
			expect(JSON.parse(wrapper.prop('data-props'))).toEqual({
				propertyName: 'testProperty',
			});
			expect(wrapper.children().length).toEqual(3);
			expect(
				wrapper
					.childAt(0)
					.is(
						'ul.relationship-editor__list.editable-relationships.o-layout__unstyled-element#ul-testProperty',
					),
			).toBe(true);
			expect(
				wrapper
					.childAt(1)
					.is(
						'input[type="hidden"]#id-testProperty[name="testProperty"]',
					),
			).toBe(true);
			expect(wrapper.childAt(1).prop('value')).toEqual('null');
			expect(wrapper.childAt(2).is('div.o-layout-typography')).toBe(true);
			expect(getAutoSuggest(wrapper).is(ReactAutosuggest)).toBe(true);
		});

		describe('N-to-one field', () => {
			it('Can render an empty field', () => {
				const props = {
					propertyName: 'testProperty',
					hasMany: false,
					value: null,
				};
				const wrapper = shallow(<RelationshipPicker {...props} />);
				expect(getRelationshipList(wrapper).children().length).toBe(0);
				expect(getHiddenInput(wrapper).prop('value')).toEqual('null');
			});
			it('Can render a field with a single relationship', () => {
				const rel = { code: 'my-code', name: 'My name' };
				const props = {
					propertyName: 'testProperty',
					hasMany: false,
					value: rel,
				};
				const wrapper = shallow(<RelationshipPicker {...props} />);
				expect(getRelationshipList(wrapper).children().length).toBe(1);
				expect(
					getRelationshipList(wrapper)
						.childAt(0)
						.is(Relationship),
				).toBe(true);
				expect(
					getRelationshipList(wrapper)
						.childAt(0)
						.props(),
				).toMatchObject({ value: rel, disabled: false, index: 0 });
				expect(
					JSON.parse(getHiddenInput(wrapper).prop('value')),
				).toEqual(rel);
			});

			it('Can render a field with a single relationship with no name', () => {
				const rel = { code: 'my-code' };
				const props = {
					propertyName: 'testProperty',
					hasMany: false,
					value: rel,
				};
				const wrapper = shallow(<RelationshipPicker {...props} />);
				expect(
					wrapper.childAt(0).is('ul.relationship-editor__list'),
				).toBe(true);
				expect(
					getRelationshipList(wrapper)
						.childAt(0)
						.is(Relationship),
				).toBe(true);
				expect(
					getRelationshipList(wrapper)
						.childAt(0)
						.props(),
				).toMatchObject({ value: rel, disabled: false, index: 0 });
				expect(
					JSON.parse(getHiddenInput(wrapper).prop('value')),
				).toEqual(rel);
			});

			it('Disables input when relationship selected', () => {
				const rel = { code: 'my-code', name: 'My name' };
				const props = {
					propertyName: 'testProperty',
					hasMany: false,
					value: rel,
				};
				const wrapper = shallow(<RelationshipPicker {...props} />);
				expect(
					getAutoSuggest(wrapper).prop('inputProps'),
				).toMatchObject({
					disabled: true,
					placeholder:
						'Click "Remove" to replace the existing unique relationship',
				});
			});
		});
		describe('N-to-N field', () => {
			it('Can render an empty field', () => {
				const props = {
					propertyName: 'testProperty',
					hasMany: true,
					value: null,
				};
				const wrapper = shallow(<RelationshipPicker {...props} />);
				expect(getRelationshipList(wrapper).children().length).toBe(0);
				expect(getHiddenInput(wrapper).prop('value')).toEqual('[]');
			});
			it('Can render a field with a single relationship', () => {
				const rel = { code: 'my-code', name: 'My name' };
				const props = {
					propertyName: 'testProperty',
					hasMany: true,
					value: [rel],
				};
				const wrapper = shallow(<RelationshipPicker {...props} />);
				expect(getRelationshipList(wrapper).children().length).toBe(1);
				expect(
					getRelationshipList(wrapper)
						.childAt(0)
						.is(Relationship),
				).toBe(true);
				expect(
					getRelationshipList(wrapper)
						.childAt(0)
						.props(),
				).toMatchObject({ value: rel, disabled: false, index: 0 });
				expect(
					JSON.parse(getHiddenInput(wrapper).prop('value')),
				).toEqual([rel]);
			});
			it('Can render a field with a single relationship with no name', () => {
				const rel = { code: 'my-code' };
				const props = {
					propertyName: 'testProperty',
					hasMany: true,
					value: [rel],
				};
				const wrapper = shallow(<RelationshipPicker {...props} />);
				expect(getRelationshipList(wrapper).children().length).toBe(1);
				expect(
					getRelationshipList(wrapper)
						.childAt(0)
						.is(Relationship),
				).toBe(true);
				expect(
					getRelationshipList(wrapper)
						.childAt(0)
						.props(),
				).toMatchObject({ value: rel, disabled: false, index: 0 });
				expect(
					JSON.parse(getHiddenInput(wrapper).prop('value')),
				).toEqual([rel]);
			});
			it('Can render a field with multiple relationships', () => {
				const rel1 = { code: 'my-code1', name: 'My name1' };
				const rel2 = { code: 'my-code2', name: 'My name2' };
				const props = {
					propertyName: 'testProperty',
					hasMany: true,
					value: [rel1, rel2],
				};
				const wrapper = shallow(<RelationshipPicker {...props} />);
				expect(getRelationshipList(wrapper).children().length).toBe(2);
				expect(
					getRelationshipList(wrapper)
						.childAt(0)
						.is(Relationship),
				).toBe(true);
				expect(
					getRelationshipList(wrapper)
						.childAt(0)
						.props(),
				).toMatchObject({ value: rel1, disabled: false, index: 0 });
				expect(
					getRelationshipList(wrapper)
						.childAt(1)
						.is(Relationship),
				).toBe(true);
				expect(
					getRelationshipList(wrapper)
						.childAt(1)
						.props(),
				).toMatchObject({ value: rel2, disabled: false, index: 1 });
				expect(
					JSON.parse(getHiddenInput(wrapper).prop('value')),
				).toEqual([rel1, rel2]);
			});
		});

		describe('locking', () => {
			it('Can lock the field from editing', () => {
				const rel = { code: 'my-code', name: 'My name' };
				const props = {
					propertyName: 'testProperty',
					hasMany: true,
					value: [rel],
					lockedBy: 'tomato',
				};
				const wrapper = shallow(<RelationshipPicker {...props} />);
				expect(getRelationshipList(wrapper).children().length).toBe(1);
				expect(
					getRelationshipList(wrapper)
						.childAt(0)
						.is(Relationship),
				).toBe(true);
				expect(
					getRelationshipList(wrapper)
						.childAt(0)
						.props(),
				).toMatchObject({ value: rel, disabled: true, index: 0 });
				expect(
					JSON.parse(getHiddenInput(wrapper).prop('value')),
				).toEqual([rel]);
				expect(wrapper.find(ReactAutosuggest).length).toBe(0);
			});
		});
	});

	describe('adding a relationship', () => {
		const suggestions = [
			{ code: 'anyone' },
			{ code: 'can' },
			{ code: 'play' },
			{ code: 'guitar' },
		];
		beforeAll(() => {
			fetchMock.get('begin:/autocomplete/MainType/name?q=a', suggestions);
		});
		// Can't figure out how to kick this off with a change to the input value
		// So, for now, treating React-Autosuggest as a black box
		it('fetches suggestions from the autocomplete api', async () => {
			const props = {
				propertyName: 'testProperty',
				hasMany: true,
				type: 'MainType',
				parentType: 'ParentType',
				value: [],
			};

			const wrapper = shallow(<RelationshipPicker {...props} />);

			wrapper.instance().fetchSuggestions({
				value: 'a',
			});
			expect(fetchMock.lastUrl()).toEqual(
				'/autocomplete/MainType/name?q=a&parentType=ParentType&propertyName=testProperty',
			);
			await fetchMock.flush();

			await new Promise(res => setTimeout(res, 50));
			wrapper.update();
			// would like to test html output, but can't figure out how. Props is fine for now
			expect(getAutoSuggest(wrapper).prop('suggestions')).toEqual(
				suggestions,
			);
		});
		it('does not suggest previously selected records', async () => {
			const props = {
				propertyName: 'testProperty',
				hasMany: true,
				type: 'MainType',
				parentType: 'ParentType',
				value: suggestions.slice(0, 2),
			};
			const wrapper = shallow(<RelationshipPicker {...props} />);

			wrapper.instance().fetchSuggestions({
				value: 'a',
			});
			expect(fetchMock.lastUrl()).toEqual(
				'/autocomplete/MainType/name?q=a&parentType=ParentType&propertyName=testProperty',
			);
			await fetchMock.flush();

			await new Promise(res => setTimeout(res, 50));
			wrapper.update();
			// would like to test html output, but can't figure out how. Props is fine for now
			expect(getAutoSuggest(wrapper).prop('suggestions')).toEqual(
				suggestions.slice(2),
			);
		});

		it('can select a selection when hasMany is false', async () => {
			const props = {
				propertyName: 'testProperty',
				hasMany: false,
				type: 'MainType',
				value: null,
			};
			const wrapper = shallow(<RelationshipPicker {...props} />);

			wrapper.setState({
				suggestions,
			});
			wrapper.instance().addRelationship(
				{
					preventDefault: () => null,
				},
				{
					suggestion: suggestions[2],
				},
			);
			await new Promise(res => setTimeout(res, 1));
			expect(getAutoSuggest(wrapper).prop('suggestions')).toEqual([]);
			expect(getRelationshipList(wrapper).children().length).toBe(1);
			expect(
				getRelationshipList(wrapper)
					.childAt(0)
					.props(),
			).toMatchObject({
				value: suggestions[2],
				disabled: false,
				index: 0,
			});
			expect(getAutoSuggest(wrapper).prop('inputProps')).toMatchObject({
				disabled: true,
				placeholder:
					'Click "Remove" to replace the existing unique relationship',
			});
			expect(JSON.parse(getHiddenInput(wrapper).prop('value'))).toEqual(
				suggestions[2],
			);
		});

		it('can select a selection when hasMany is true', async () => {
			const props = {
				propertyName: 'testProperty',
				hasMany: true,
				type: 'MainType',
				value: [],
			};
			const wrapper = shallow(<RelationshipPicker {...props} />);
			wrapper.setState({
				suggestions,
			});
			wrapper.instance().addRelationship(
				{
					preventDefault: () => null,
				},
				{
					suggestion: suggestions[2],
				},
			);
			await new Promise(res => setTimeout(res, 1));
			expect(getAutoSuggest(wrapper).prop('suggestions')).toEqual([]);
			expect(getRelationshipList(wrapper).children().length).toBe(1);
			expect(
				getRelationshipList(wrapper)
					.childAt(0)
					.props(),
			).toMatchObject({
				value: suggestions[2],
				disabled: false,
				index: 0,
			});
			expect(
				getAutoSuggest(wrapper).prop('inputProps'),
			).not.toMatchObject({
				disabled: true,
			});
			expect(JSON.parse(getHiddenInput(wrapper).prop('value'))).toEqual([
				suggestions[2],
			]);
		});

		it('can select another selection when hasMany is true', async () => {
			const props = {
				propertyName: 'testProperty',
				hasMany: true,
				type: 'MainType',
				value: suggestions.slice(0, 1),
			};
			const wrapper = shallow(<RelationshipPicker {...props} />);
			wrapper.setState({
				suggestions,
			});
			wrapper.instance().addRelationship(
				{
					preventDefault: () => null,
				},
				{
					suggestion: suggestions[2],
				},
			);
			await new Promise(res => setTimeout(res, 1));
			expect(getAutoSuggest(wrapper).prop('suggestions')).toEqual([]);
			expect(getRelationshipList(wrapper).children().length).toBe(2);
			expect(
				getRelationshipList(wrapper)
					.childAt(0)
					.props(),
			).toMatchObject({
				value: suggestions[0],
				disabled: false,
				index: 0,
			});
			expect(
				getRelationshipList(wrapper)
					.childAt(1)
					.props(),
			).toMatchObject({
				value: suggestions[2],
				disabled: false,
				index: 1,
			});
			expect(
				getAutoSuggest(wrapper).prop('inputProps'),
			).not.toMatchObject({
				disabled: true,
			});
			expect(JSON.parse(getHiddenInput(wrapper).prop('value'))).toEqual([
				suggestions[0],
				suggestions[2],
			]);
		});
	});
	describe('removing a a relationship', () => {
		it('can remove a N-to-1 relationship', async () => {
			const rel = { code: 'my-code', name: 'My name' };
			const props = {
				propertyName: 'testProperty',
				hasMany: false,
				value: rel,
			};
			const wrapper = mount(<RelationshipPicker {...props} />);
			getRelationshipList(wrapper)
				.children()
				.first()
				.find('.relationship-remove-button')
				.simulate('click');
			await new Promise(res => setTimeout(res, 1));
			wrapper.update();
			expect(getRelationshipList(wrapper).children().length).toBe(0);
			expect(getHiddenInput(wrapper).prop('value')).toEqual('null');
			expect(
				getAutoSuggest(wrapper).prop('inputProps'),
			).not.toMatchObject({
				disabled: true,
			});
		});
		it('can remove a N-to-N relationship, leaving some remaining', async () => {
			const rel1 = { code: 'my-code1', name: 'My name1' };
			const rel2 = { code: 'my-code2', name: 'My name2' };
			const props = {
				propertyName: 'testProperty',
				hasMany: true,
				value: [rel1, rel2],
			};
			const wrapper = mount(<RelationshipPicker {...props} />);
			getRelationshipList(wrapper)
				.children()
				.first()
				.find('.relationship-remove-button')
				.simulate('click');
			await new Promise(res => setTimeout(res, 1));
			wrapper.update();
			expect(getRelationshipList(wrapper).children().length).toBe(1);
			expect(
				getRelationshipList(wrapper)
					.childAt(0)
					.props(),
			).toMatchObject({ value: rel2, disabled: false, index: 0 });

			expect(JSON.parse(getHiddenInput(wrapper).prop('value'))).toEqual([
				rel2,
			]);
		});
		it('can remove a N-to-1 relationship, leaving none behind', async () => {
			const rel = { code: 'my-code', name: 'My name' };
			const props = {
				propertyName: 'testProperty',
				hasMany: true,
				value: rel,
			};
			const wrapper = mount(<RelationshipPicker {...props} />);
			getRelationshipList(wrapper)
				.children()
				.first()
				.find('.relationship-remove-button')
				.simulate('click');
			await new Promise(res => setTimeout(res, 1));
			wrapper.update();
			expect(getRelationshipList(wrapper).children().length).toBe(0);
			expect(getHiddenInput(wrapper).prop('value')).toEqual('[]');
		});
	});
});
