/* global fetch */
const { h, Fragment, Component } = require('preact');

const checkIfShouldDisable = (lockedBy, unique = false, isEdit = false) => {
	return (unique && isEdit) || !!lockedBy;
};

const RelationshipRow = ({ propertyName, value, shouldDisable }) => (
	<li
		id={`${propertyName}-${value.code}`}
		data-name={value.name}
		data-code={value.code}
		className="suggest"
	>
		<button
			type="button"
			id={`btn-${propertyName}-${value.code}`}
			disabled={shouldDisable ? 'disabled' : null}
			className={`o-buttons o-buttons--small ${
				shouldDisable ? 'disabled' : ''
			}`}
		>
			Remove
		</button>
		<span className="o-layout-typography">{value.name || value.code}</span>
	</li>
);

const RelationshipRows = ({
	hasMany,
	selectedRelationships,
	propertyName,
	shouldDisable,
}) => {
	if (!selectedRelationships) {
		return null;
	}

	selectedRelationships = hasMany
		? selectedRelationships
		: [selectedRelationships];

	return selectedRelationships.map(val => (
		<RelationshipRow
			propertyName={propertyName}
			value={val}
			shouldDisable={shouldDisable}
		/>
	));
};

class RelationshipPicker extends Component {
	constructor(props) {
		super();
		this.state = {
			searchTerm: '',
			suggestions: [],
			selectedRelationships: props.value,
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
	}

	onChange(event, { newValue }) {
		this.setState({
			searchTerm: newValue,
		});
	}

	// Autosuggest will call this function every time you need to update suggestions.
	// You already implemented this logic above, so just use it.
	onSuggestionsFetchRequested({ value }) {
		if (!value) {
			return;
		}
		fetch(
			`/autocomplete/${this.props.type}/name?q=${value}&parentType=${this.props.parentType}&propertyName=${this.props.propertyName}`,
		)
			.then(results => results.json())
			.then(results => {
				this.setState({
					suggestions: results
						// avoid new suggestions including values that have already been selected
						.filter(
							suggestion =>
								!this.props.value.find(
									({ code }) => code === suggestion.code,
								),
						),
				});
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
				selectedRelationships: suggestion,
			});
		}
	}

	// Autosuggest will call this function every time you need to clear suggestions.
	onSuggestionsClearRequested() {
		this.setState({
			suggestions: [],
		});
	}

	render() {
		const { props } = this;
		const {
			propertyName,
			hasMany,
			dataType,
			lockedBy,
			parentType,
			AutocompleteComponent,
		} = props;
		const shouldDisable = checkIfShouldDisable(lockedBy);
		const { searchTerm, suggestions, selectedRelationships } = this.state;

		return (
			<div
				data-component="relationship-picker"
				data-type={dataType}
				data-has-many={hasMany ? true : null}
				data-property-name={propertyName}
				data-parent-type={parentType}
				data-value={JSON.stringify(selectedRelationships)}
				data-disabled={shouldDisable}
			>
				<ul
					className="relationship-editor__list editable-relationships o-layout__unstyled-element"
					id={`ul-${propertyName}`}
				>
					<RelationshipRows
						{...props}
						selectedRelationships={selectedRelationships}
						shouldDisable={shouldDisable}
					/>
				</ul>
				<input
					type="hidden"
					id={`id-${propertyName}`}
					name={propertyName}
					value={JSON.stringify(selectedRelationships)}
				/>
				<div className="o-layout-typography">
					{shouldDisable ? null : (
						<Fragment>
							{AutocompleteComponent ? (
								<AutocompleteComponent
									{...props}
									searchTerm={searchTerm}
									suggestions={suggestions}
									onChange={this.onChange}
									onSuggestionsFetchRequested={
										this.onSuggestionsFetchRequested
									}
									onSuggestionsClearRequested={
										this.onSuggestionsClearRequested
									}
									onSuggestionSelected={
										this.onSuggestionSelected
									}
								/>
							) : null}
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
