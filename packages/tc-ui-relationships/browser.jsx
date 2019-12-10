const { render, h } = require('preact');
const { RelationshipPicker } = require('./lib/relationship-picker');

module.exports = {
	attachRelationshipPicker: container => {
		const props = {
			...container.dataset,
			dataType: container.dataset.type,
			value: JSON.parse(container.dataset.value),
			hasMany: !!container.dataset.hasMany,
		};
		const Picker = <RelationshipPicker {...props} />;
		render(Picker, container);
	},
};
