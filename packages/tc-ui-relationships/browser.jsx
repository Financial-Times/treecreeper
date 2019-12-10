require('preact/debug');
const { render, h } = require('preact');
const { RelationshipPicker } = require('./lib/relationship-picker.jsx');
const { Autocomplete } = require('./lib/autocomplete.jsx');

module.exports = {
	attachRelationshipPicker: container => {
		const props = {
			...container.dataset,
			dataType: container.dataset.type,
			value: JSON.parse(container.dataset.value),
			hasMany: 'hasMany' in container.dataset,
			AutocompleteComponent: Autocomplete,
		};
		const Picker = <RelationshipPicker {...props} />;
		render(Picker, document, container);
	},
};
