const {
	getEnums,
	getTypes,
	getPrimitiveTypes,
} = require('@financial-times/tc-schema-sdk');
const Components = require('../templates/components/edit-components');

const assignComponent = itemType => {
	const primitiveTypes = getPrimitiveTypes({ output: 'component' });
	const objectTypes = getTypes().map(type => type.name);
	if (itemType) {
		if (getEnums()[itemType]) {
			return Components.Dropdown;
		}
		if (primitiveTypes[itemType]) {
			return Components[primitiveTypes[itemType]];
		}
		if (objectTypes.includes(itemType)) {
			return Components.Relationship;
		}
	}

	return Components.Text;
};

module.exports = { assignComponent };
