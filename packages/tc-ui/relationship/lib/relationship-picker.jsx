/* global fetch */
const { h, Fragment, Component } = require('preact');
const ReactAutosuggest = require('react-autosuggest');
const Highlighter = require('react-highlight-words');

const ENTER = 13;
const TAB = 9;

const toArray = val => {
	if (!val) {
		return [];
	}
	return Array.isArray(val) ? val : [val];
};

const suggestionToStringList = suggestion => {
	const list = [suggestion.code.toLowerCase()];
	if (suggestion.name) {
		list.push(suggestion.name.toLowerCase());
	}
	return list;
};

const UserInput = inputProps => (
	<span className="o-forms-input o-forms-input--text">
		<input
			id={`${inputProps.propertyName}-picker`}
			className="autocomplete__input"
			type="text"
			autoComplete="off"
			{...inputProps}
		/>
	</span>
);

const Suggestion = ({ suggestion, searchTerm }) => (
	<Fragment>
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
	</Fragment>
);

const Relationship = ({ value, disabled, onRelationshipRemove, index }) => (
	<li
		data-name={value.name}
		data-code={value.code}
		className="selected-relationship"
	>
		<button
			type="button"
			disabled={disabled ? 'disabled' : null}
			className={`o-buttons o-buttons--small ${
				disabled ? 'disabled' : ''
			}`}
			onClick={onRelationshipRemove}
			data-index={index}
			key={index}
		>
			Remove
		</button>
		<span className="o-layout-typography">{value.name || value.code}</span>
	</li>
);

class RelationshipPicker extends Component {
	constructor(props) {
		super();
		this.state = {
			searchTerm: '',
			suggestions: [],
			isUserError: false,
			isUnresolved: false,
			selectedRelationships: toArray(props.value),
			hasHighlightedSelection: false,
		};
		this.props = props;
		this.onChange = this.onChange.bind(this);
		this.onSuggestionsFetchRequested = this.onSuggestionsFetchRequested.bind(
			this,
		);
		this.onSuggestionsClearRequested = this.onSuggestionsClearRequested.bind(
			this,
		);
		this.onSuggestionSelected = this.onSuggestionSelected.bind(this);
		this.onRelationshipRemove = this.onRelationshipRemove.bind(this);
		this.onUserMisconception = this.onUserMisconception.bind(this);
		this.onSuggestionHighlighted = this.onSuggestionHighlighted.bind(this);
	}

	onRelationshipRemove(event) {
		this.setState(({ selectedRelationships }) => {
			selectedRelationships = [...selectedRelationships];
			selectedRelationships.splice(event.target.dataset.index, 1);
			return { selectedRelationships };
		});
		event.preventDefault();
	}

	onChange(event, { newValue }) {
		this.setState({
			searchTerm: newValue,
			isUnresolved: !!newValue,
		});
	}

	onSuggestionsFetchRequested({ value }) {
		if (!value) {
			return;
		}
		return fetch(
			`/autocomplete/${this.props.type}/name?q=${value}&parentType=${this.props.parentType}&propertyName=${this.props.propertyName}`,
		)
			.then(results => results.json())
			.then(results => {
				this.setState(({ selectedRelationships }) => ({
					suggestions: results
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

	onSuggestionSelected(event, { suggestion }) {
		if (this.props.hasMany) {
			this.setState(({ selectedRelationships }) => {
				selectedRelationships = [...selectedRelationships, suggestion];
				return { selectedRelationships };
			});
		} else {
			this.setState({
				selectedRelationships: [suggestion],
			});
		}
		this.setState({
			searchTerm: '',
			isUserError: false,
			isUnresolved: false,
		});
		// this is needed to prevent the event propagating up  and then
		// immediately clicking another button. VERY odd behaviour, and
		// don't fully understand why, but this is the fix
		if (event) {
			event.preventDefault();
		}
	}

	onSuggestionHighlighted({ suggestion }) {
		this.setState({
			hasHighlightedSelection: !!suggestion,
		});
	}

	// Autosuggest will call this function every time you need to clear suggestions.
	onSuggestionsClearRequested() {
		this.setState({
			suggestions: [],
		});
	}

	onUserMisconception(event) {
		if (event.target.value) {
			// If hitting tab
			if (event.keyCode === TAB) {
				// If only one option in the dropdown, which exactly matches
				// the text entered by the user, go ahead and select it
				if (
					this.state.suggestions.length === 1 &&
					suggestionToStringList(this.state.suggestions[0]).includes(
						event.target.value.toLowerCase(),
					)
				) {
					this.syntheticSelect();
				} else {
					this.setState({
						isUserError: true,
						suggestions: [],
					});
				}
				event.preventDefault();
			}

			// If hitting enter
			if (
				event.keyCode === ENTER &&
				this.state.suggestions.length &&
				!this.state.hasHighlightedSelection
			) {
				// If only one option in the dropdown, go ahead and select it
				if (this.state.suggestions.length === 1) {
					this.syntheticSelect();
				} else {
					this.setState({
						isUserError: true,
						suggestions: [],
					});
				}
				// prevent the form being submitted
				event.stopImmediatePropagation();
				event.preventDefault();
				return false;
			}
		}
	}

	shouldDisable(unique = false, isEdit = false) {
		return (unique && isEdit) || !!this.props.lockedBy;
	}

	toFormData(relationships) {
		// TO INVESTIGATE - does an empty array now fail to delete
		// relationships in replace mode?
		if (!this.props.hasMany) {
			relationships = relationships.length ? relationships[0] : null;
		}
		return JSON.stringify(relationships);
	}

	syntheticSelect() {
		this.onSuggestionSelected(null, {
			suggestion: this.state.suggestions[0],
		});
		this.setState({
			suggestions: [],
		});
	}

	render() {
		const { props } = this;
		const { propertyName } = props;
		const disabled = this.shouldDisable();
		const {
			searchTerm,
			suggestions,
			selectedRelationships,
			isUserError,
			isUnresolved,
		} = this.state;

		return (
			<div
				data-props={JSON.stringify(props)}
				data-component="relationship-picker"
				data-disabled={disabled}
				data-is-unresolved={isUnresolved}
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
				<div className="o-layout-typography">
					{disabled ? null : (
						<Fragment>
							<ReactAutosuggest
								suggestions={suggestions}
								onSuggestionsFetchRequested={
									this.onSuggestionsFetchRequested
								}
								onSuggestionsClearRequested={
									this.onSuggestionsClearRequested
								}
								onSuggestionSelected={this.onSuggestionSelected}
								onSuggestionHighlighted={
									this.onSuggestionHighlighted
								}
								inputProps={{
									propertyName: props.propertyName,
									value: searchTerm,
									onChange: this.onChange,
									onKeyDown: this.onUserMisconception,
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
									Use the mouse or arrow and enter keys to
									select from the suggestions
								</div>
							</span>
						</Fragment>
					)}
				</div>
			</div>
		);
	}
}

module.exports = { RelationshipPicker };
