// here's an extremely bare bones example of an autocomplete
const { h, Fragment } = require('preact');
const ReactAutosuggest = require('react-autosuggest');
const Highlighter = require('react-highlight-words');

const Autocomplete = props => (
	<ReactAutosuggest
		suggestions={[
			{ code: 'apple', name: 'apple' },
			{ code: 'pear', name: 'pear' },
			{ code: 'orange', name: 'orange' },
			{ code: 'grape', name: 'grape' },
			{ code: 'banana', name: 'banana' },
		]}
		onSuggestionsFetchRequested={() => null}
		onSuggestionsClearRequested={() => null}
		inputProps={{ value: props.searchTerm, onChange: props.onChange }}
		getSuggestionValue={item => item.code}
		renderSuggestion={(suggestion, { query }) => (
			<Fragment>
				<Highlighter
					searchWords={query.split(' ')}
					autoEscape
					textToHighlight={suggestion.name}
				/>{' '}
				<small>
					(
					<Highlighter
						searchWords={query.split(' ')}
						autoEscape
						textToHighlight={suggestion.code}
					/>
					)
				</small>
			</Fragment>
		)}
		renderInputComponent={inputProps => (
			<span className="o-forms-input o-forms-input--text">
				<input
					name={props.propertyName}
					id={`${props.propertyName}-picker`}
					className="autocomplete__input"
					type="text"
					autoComplete="off"
					{...inputProps}
				/>
			</span>
		)}
	/>
);
module.exports = { Autocomplete };
