const { Component } = require('preact');

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
		this.setState({});
		this.propertyName = this.container.dataset.propertyName;
		this.parentType = this.container.dataset.parentType;
		this.type = this.container.dataset.type;

		this.input.addEventListener('focus', this.clearErrorState.bind(this));
		this.input.addEventListener(
			'keydown',
			this.handleUserMisconceptions.bind(this),
		);
	}

	setErrorState() {
		this.container.classList.add('o-forms--error');
	}

	clearErrorState() {
		this.container.classList.remove('o-forms--error');
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
}

module.exports = { RelationshipEditor };
