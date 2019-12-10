const Awesomplete = require('awesomplete');

const ENTER = 13;
const TAB = 9;

class RelationshipEditor {
	constructor(container) {
		this.container = container;
		this.input = container.querySelector('input.suggest');
		this.list = container.querySelector('.relationship-editor__list');
		this.propertyName = this.input.id.substring(7);
		this.hasMany = !!this.input.dataset.hasMany;
		this.propertyName = this.input.dataset.propertyName;
		this.parentType = this.input.dataset.parentType;
		this.type = this.input.dataset.type;
		this.suggester = new Awesomplete(this.input, {
			minChars: 1,
			filter: () => true,
		});

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
		this.updateInput();
	}

	select() {
		this.suggester.goto(0);
		this.suggester.select();
	}

	clearErrorState() {
		this.container.classList.remove('o-forms--error');
	}

	setErrorState() {
		this.container.classList.add('o-forms--error');
	}

	hasSuggestions() {
		return this.suggester.suggestions && this.suggester.suggestions.length;
	}

	handleUserMisconceptions(event) {
		if (event.target.value) {
			// If hitting tab
			if (event.keyCode === TAB) {
				// If only one option in the dropdown, which exactly matches
				// the text entered by the user, go ahead and select it
				if (
					this.hasSuggestions() &&
					this.suggester.suggestions.length === 1 &&
					[
						this.suggester.suggestions[0].label.toLowerCase(),
						this.suggester.suggestions[0].value.toLowerCase(),
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
				if (this.suggester.suggestions.length === 1) {
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
				this.suggester.list = results
					.filter(
						suggestion => !existingItems.includes(suggestion.code),
					)
					.map(item => ({
						label: item.name,
						value: item.code,
					}));
			});
	}

	addRelationship(event) {
		const { label, value } = event.text;
		this.input.value = '';
		const listItem = `
	<li id="${this.propertyName}-${value}" data-name="${label}" class="suggest">
	<button class="o-buttons o-buttons--small" id="btn-${this.propertyName}-${value}">Remove</button><span class="o-layout-typography">${label}</span>
	</li>
	`;
		if (this.hasMany) {
			this.list.insertAdjacentHTML('beforeend', listItem);
		} else {
			this.list.innerHTML = listItem;
		}
		this.updateFields();
	}

	removeRelationship(event) {
		if (event.target.nodeName === 'BUTTON') {
			event.target.closest('li').remove();
			this.updateFields();
		}
		event.preventDefault();
	}

	updateInput(items) {
		if (!this.hasMany) {
			items = items || [...this.list.querySelectorAll('li')];
			const shouldDisable = !!items.length;
			if (shouldDisable) {
				this.input.setAttribute('disabled', true);
			} else {
				this.input.removeAttribute('disabled');
			}

			this.input.setAttribute(
				'placeholder',
				shouldDisable
					? "Click 'Remove' to replace the existing unique relationship"
					: '',
			);
		}
	}

	updateFields() {
		const prefixLength = this.propertyName.length + 1;
		const items = [...this.list.querySelectorAll('li')];
		this.container.querySelector(
			`#id-${this.propertyName}`,
		).value = items.map(item => item.id.substring(prefixLength));
		this.container.querySelector(
			`#name-${this.propertyName}`,
		).value = items.map(item => encodeURIComponent(item.dataset.name));
		this.updateInput(items);
	}
}

module.exports = RelationshipEditor;
