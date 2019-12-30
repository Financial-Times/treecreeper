/* global fetch */
const React = require('react');
const ReactAutosuggest = require('react-autosuggest');
const Highlighter = require('react-highlight-words');
const { Relationship } = require('./relationship');

const ENTER = 13;
const TAB = 9;

const toArray = val => {
	if (!val) {
		return [];
	}
	return Array.isArray(val) ? val : [val];
};

const UserInput = inputProps => (
	<span className="o-forms-input o-forms-input--text">
		<input {...inputProps} />
	</span>
);

const Suggestion = ({ suggestion, searchTerm }) => (
	<>
		<Highlighter
			searchWords={searchTerm.split(' ')}
			autoEscape
			textToHighlight={suggestion.name || suggestion.code}
		/>{' '}
		{suggestion.name ? (
			<small>
				(
				<Highlighter
					searchWords={searchTerm.split(' ')}
					autoEscape
					textToHighlight={suggestion.code}
				/>
				)
			</small>
		) : null}
	</>
);

class RelationshipPicker extends React.Component {
	constructor(props) {
		super();
		const selectedRelationships = toArray(props.value);
		this.state = {
			searchTerm: '',
			suggestions: [],
			isUserError: false,
			isUnresolved: false,
			selectedRelationships,
			hasHighlightedSelection: false,
			isFull: !props.hasMany && !!selectedRelationships.length,
		};
		this.props = props;
		this.onSearchTermChange = this.onSearchTermChange.bind(this);
		this.fetchSuggestions = this.fetchSuggestions.bind(this);
		this.clearSuggestions = this.clearSuggestions.bind(this);
		this.addRelationship = this.addRelationship.bind(this);
		this.onRelationshipRemove = this.onRelationshipRemove.bind(this);
		this.onUserMisconception = this.onUserMisconception.bind(this);
		this.onSuggestionHighlighted = this.onSuggestionHighlighted.bind(this);
	}

	onRelationshipRemove(event) {
		this.setState(({ selectedRelationships }) => {
			selectedRelationships = [...selectedRelationships];
			selectedRelationships.splice(event.target.dataset.index, 1);
			return { selectedRelationships, isFull: false };
		});
		// this is needed to prevent the event propagating up and then
		// immediately clicking another button. VERY odd behaviour, and
		// don't fully understand why, but this is the fix
		event.preventDefault();
	}

	onSearchTermChange(event, { newValue }) {
		this.setState({
			searchTerm: newValue,
			isUnresolved: !!newValue,
			isUserError: false,
		});
	}

	onSuggestionHighlighted({ suggestion }) {
		this.setState({
			hasHighlightedSelection: !!suggestion,
		});
	}

	onUserMisconception(event) {
		if (event.target.value) {
			// If hitting tab
			if (event.keyCode === TAB) {
				// If only one option in the dropdown, which exactly matches
				// the text entered by the user, go ahead and select it
				this.maybeSelectIfOnlyOneSuggestion(() =>
					Object.values(this.state.suggestions[0])
						.map(str => str.toLowerCase())
						.includes(event.target.value.toLowerCase()),
				);
				event.preventDefault();
			}

			// If hitting enter
			if (
				event.keyCode === ENTER &&
				this.state.suggestions.length &&
				// this is needed because the event fires on the input even
				// when it was originally triggered on an item in the
				// suggestion list
				!this.state.hasHighlightedSelection
			) {
				this.maybeSelectIfOnlyOneSuggestion();
				// prevent the form being submitted
				event.stopImmediatePropagation();
				event.preventDefault();
				return false;
			}
		}
	}

	fetchSuggestions({ value }) {
		if (!value) {
			return;
		}
		return fetch(
			`/autocomplete/${this.props.type}/name?q=${value}&parentType=${this.props.parentType}&propertyName=${this.props.propertyName}`,
		)
			.then(response => response.json())
			.then(suggestions => {
				this.setState(({ selectedRelationships }) => ({
					suggestions: suggestions
						// avoid new suggestions including values that have already been selected
						.filter(
							suggestion =>
								!selectedRelationships.find(
									({ code }) => code === suggestion.code,
								),
						),
				}));
			});
	}

	addRelationship(event, { suggestion }) {
		const neutralState = {
			searchTerm: '',
			isUserError: false,
			isUnresolved: false,
			suggestions: [],
		};
		if (this.props.hasMany) {
			this.setState(({ selectedRelationships }) => {
				selectedRelationships = [...selectedRelationships, suggestion];
				return { ...neutralState, selectedRelationships };
			});
		} else {
			this.setState({
				...neutralState,
				selectedRelationships: [suggestion],
				isFull: true,
			});
		}
		// this is needed to prevent the event propagating up and then
		// immediately clicking another button. VERY odd behaviour, and
		// don't fully understand why, but this is the fix
		if (event) {
			event.preventDefault();
		}
	}

	clearSuggestions() {
		this.setState({
			suggestions: [],
		});
	}

	maybeSelectIfOnlyOneSuggestion(test = () => true) {
		if (this.state.suggestions.length === 1 && test()) {
			this.addRelationship(null, {
				suggestion: this.state.suggestions[0],
			});
		} else {
			this.setState({
				isUserError: true,
				suggestions: [],
			});
		}
	}

	toFormData(relationships) {
		if (!this.props.hasMany) {
			relationships = relationships.length ? relationships[0] : null;
		}
		return JSON.stringify(relationships);
	}

	render() {
		const { props } = this;
		const { propertyName } = props;
		const disabled = !!this.props.lockedBy;
		const {
			searchTerm,
			suggestions,
			selectedRelationships,
			isUserError,
			isUnresolved,
			isFull,
		} = this.state;

		return (
			<div
				data-props={JSON.stringify(props)}
				data-component="relationship-picker"
				data-disabled={disabled ? true : null}
				data-is-unresolved={isUnresolved ? true : null}
				className={isUserError ? 'o-forms-input--invalid' : ''}
			>
				<ul
					className="relationship-editor__list editable-relationships o-layout__unstyled-element"
					id={`ul-${propertyName}`}
				>
					{selectedRelationships.map((val, i) => (
						<Relationship
							value={val}
							disabled={disabled}
							onRelationshipRemove={this.onRelationshipRemove}
							index={i}
						/>
					))}
				</ul>
				<input
					type="hidden"
					id={`id-${propertyName}`}
					name={propertyName}
					value={this.toFormData(selectedRelationships)}
				/>

				{disabled ? null : (
					<div className="o-layout-typography">
						<ReactAutosuggest
							suggestions={suggestions}
							onSuggestionsFetchRequested={this.fetchSuggestions}
							onSuggestionsClearRequested={this.clearSuggestions}
							onSuggestionSelected={this.addRelationship}
							onSuggestionHighlighted={
								this.onSuggestionHighlighted
							}
							inputProps={{
								id: `${propertyName}-picker`,
								type: 'text',
								autoComplete: 'off',
								value: searchTerm,
								onChange: this.onSearchTermChange,
								onKeyDown: this.onUserMisconception,
								disabled: isFull,
								placeholder: isFull
									? 'Click "Remove" to replace the existing unique relationship'
									: '',
							}}
							getSuggestionValue={item => item.code}
							renderSuggestion={(suggestion, { query }) => (
								<Suggestion
									suggestion={suggestion}
									searchTerm={query}
								/>
							)}
							renderInputComponent={UserInput}
						/>
						<span className="o-forms-input o-forms-input--text">
							<div className="o-forms-input__error">
								Use the mouse or arrow and enter keys to select
								from the suggestions, or delete the search text
								to move on to another field
							</div>
						</span>
					</div>
				)}
			</div>
		);
	}
}

module.exports = { RelationshipPicker };