const { Component, h } = require('preact');
const { Component: EditRelationshipView } = require('./edit');

const ENTER = 13;
const TAB = 9;

// https://www.reddit.com/r/reactjs/comments/8v4h4d/is_it_possible_to_use_this_in_react/
// https://github.com/reactjs/react-autocomplete

class RelationshipEditor extends Component {
	constructor(container) {
		super();
		this.container = container;
		this.input = container.querySelector('input.suggest');
		this.list = container.querySelector('.relationship-editor__list');
		this.propertyName = this.container.dataset.propertyName;
		this.hasMany = !!this.container.dataset.hasMany;
		this.setState({ items: this.container.dataset.items });
		this.propertyName = this.container.dataset.propertyName;
		this.parentType = this.container.dataset.parentType;
		this.type = this.container.dataset.type;

		this.input.addEventListener('input', this.getSuggestions.bind(this));
		this.input.addEventListener('focus', this.clearErrorState.bind(this));
		this.input.addEventListener('focus', this.getSuggestions.bind(this));
		this.input.addEventListener(
			'keydown',
			this.handleUserMisconceptions.bind(this),
		);
		this.input.addEventListener(
			'awesomplete-selectcomplete',
			this.addRelationship.bind(this),
		);
		this.list.addEventListener('click', this.removeRelationship.bind(this));
	}

	getSuggestions() {
		const { value } = document.querySelector(
			`#id-new-${this.propertyName}`,
		);
		if (!value) {
			return;
		}
		fetch(
			`/autocomplete/${this.type}/name?q=${value}&parentType=${this.parentType}&propertyName=${this.propertyName}`,
		)
			.then(results => results.json())
			.then(results => {
				const prefixLength = this.propertyName.length + 1;
				const existingItems = [
					...this.list.querySelectorAll('li'),
				].map(item => item.id.substring(prefixLength));
				// avoid new suggestions including values that have already been selected
				this.awesomplete.list = results
					.filter(
						suggestion => !existingItems.includes(suggestion.code),
					)
					.map(item => ({
						label: item.name,
						value: item.code,
					}));
			});
	}

	setErrorState() {
		this.container.classList.add('o-forms--error');
	}

	clearErrorState() {
		this.container.classList.remove('o-forms--error');
	}

	select() {
		this.awesomplete.goto(0);
		this.awesomplete.select();
	}

	hasSuggestions() {
		return (
			this.awesomplete.suggestions && this.awesomplete.suggestions.length
		);
	}

	handleUserMisconceptions(event) {
		if (event.target.value) {
			// If hitting tab
			if (event.keyCode === TAB) {
				// If only one option in the dropdown, which exactly matches
				// the text entered by the user, go ahead and select it
				if (
					this.hasSuggestions() &&
					this.awesomplete.suggestions.length === 1 &&
					[
						this.awesomplete.suggestions[0].label.toLowerCase(),
						this.awesomplete.suggestions[0].value.toLowerCase(),
					].includes(this.input.value.toLowerCase())
				) {
					this.select();
				} else {
					this.setErrorState();
				}
			}

			// If hitting enter
			if (event.keyCode === ENTER && this.hasSuggestions()) {
				// If only one option in the dropdown, go ahead and select it
				if (this.awesomplete.suggestions.length === 1) {
					this.select();
				} else {
					// tell the user how to select an option
					window.alert(
						'Use the arrow keys or the mouse to select an item from the list',
					);
				}
				// prevent the form being submitted
				event.stopImmediatePropagation();
				event.preventDefault();
				return false;
			}
		}
	}

	addRelationship(event) {
		const { label: name, value: code } = event.text;
		this.setState(({ items }) => {
			items = [...items, { name, code }];
			return { items };
		});
	}

	removeRelationship(event) {
		if (event.target.nodeName === 'BUTTON') {
			const removedCode = event.target.closest('li').dataset.code;
			const indexToRemove = this.items.findIndex(
				({ code }) => code === removedCode,
			);
			this.items.splice(indexToRemove, 1);
			this.render();
		}
		event.preventDefault();
	}

	render() {
		const props = {
			propertyName: this.propertyName,
			hasMany: this.hasMany,
			label: 'blah blah',
			dataType: this.type,
			value: this.items,
			parentType: this.parentType,
		};
		return <EditRelationshipView {...props} />;
	}
}

module.exports = { RelationshipEditor };
