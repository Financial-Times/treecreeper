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
		<span className="o-layout-typography">{value.name}</span>
	</li>
);

const RelationshipRows = ({ hasMany, value, propertyName, shouldDisable }) => {
	console.log({ value, hasMany });
	if (!value) {
		return null;
	}

	value = hasMany ? value : [value];

	return value.map(val => (
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
		};
		this.props = props;
		this.onChange = this.onChange.bind(this);
		this.onSuggestionsFetchRequested = this.onSuggestionsFetchRequested.bind(
			this,
		);
		this.onSuggestionsClearRequested = this.onSuggestionsClearRequested.bind(
			this,
		);
	}

	onChange(event, { newValue }) {
		this.setState({
			searchTerm: newValue,
		});
	}

	// Autosuggest will call this function every time you need to update suggestions.
	// You already implemented this logic above, so just use it.
	onSuggestionsFetchRequested({ value }) {
		this.setState({
			suggestions: [{code: 'rhys', name: 'hys'}],
		});
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
			value,
			lockedBy,
			parentType,
			AutocompleteComponent,
		} = props;
		const shouldDisable = checkIfShouldDisable(lockedBy);
		const { searchTerm, suggestions } = this.state;

		return (
			<div
				data-component="relationship-picker"
				data-type={dataType}
				data-has-many={hasMany ? true : null}
				data-property-name={propertyName}
				data-parent-type={parentType}
				data-value={JSON.stringify(value)}
				data-disabled={shouldDisable}
			>
				<ul
					className="relationship-editor__list editable-relationships o-layout__unstyled-element"
					id={`ul-${propertyName}`}
				>
					<RelationshipRows
						{...props}
						shouldDisable={shouldDisable}
					/>
				</ul>
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
