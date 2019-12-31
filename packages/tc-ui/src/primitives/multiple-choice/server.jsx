const React = require('react');
const { WrappedEditComponent } = require('../../lib/components/input-wrapper');
const { OptionsInfo } = require('../enum/server');

const Checkbox = ({ name, checkboxValue, disabled, checked }) => {
	return (
		<label>
			<input
				type="checkbox"
				name={name}
				value={checkboxValue}
				aria-label={checkboxValue}
				id={`radio1-${name}`}
				checked={checked}
				disabled={disabled}
			/>

			<span className="o-forms-input__label" aria-hidden="true">
				{checkboxValue}
			</span>
		</label>
	);
};

const EditMultipleChoice = props => {
	const { propertyName, value, options, disabled } = props;
	return (
		<span className="o-forms-input o-forms-input--checkbox o-forms-input--inline">
			{options.map((option, index) => (
				<Checkbox
					name={propertyName}
					checkboxValue={option}
					disabled={disabled}
					checked={value && value.includes(option)}
					key={index}
				/>
			))}
			<input
				type="hidden"
				value="treecreeper-fake-value"
				name={propertyName}
			/>
		</span>
	);
};

module.exports = {
	ViewComponent: ({ value, id }) => (
		<span id={id}>
			{value.map((val, i) => (
				<>
					{i > 0 ? ', ' : ''}
					<span>{val}</span>
				</>
			))}
		</span>
	),
	parser: value => {
		if (!Array.isArray(value)) {
			value = [value];
		}
		return value.filter(v => v !== 'treecreeper-fake-value');
	},
	hasValue: value => value && value.length,
	EditComponent: props => (
		<WrappedEditComponent
			Component={EditMultipleChoice}
			componentType="enum"
			expandableContent={<OptionsInfo {...props} />}
			wrapperProps={{
				role: 'group',
				'aria-labelledby': 'inline-checkbox-group-title',
			}}
			{...props}
		/>
	),
};
