const { getEnums, getTypes } = require('@financial-times/tc-schema-sdk');
const Components = require('../templates/components/edit-components');
// TODO use primitiveTypesMap from biz-ops-schema somehow
const mapComponents = {
	Sentence: 'TextArea',
	Paragraph: 'TextArea',
	Document: 'TextArea',
	Boolean: 'Boolean',
	Int: 'Number',
	Float: 'Number',
	DateTime: 'DateTime',
	Date: 'DateTime',
	Time: 'DateTime',
};

const assignComponent = itemType => {
	const validTypes = getTypes().map(type => type.name);
	if (itemType && getEnums()[itemType]) {
		return Components.Dropdown;
	}
	if (itemType && mapComponents[itemType]) {
		return Components[mapComponents[itemType]];
	}
	if (itemType && validTypes.includes(itemType)) {
		return Components.relationship;
	}
	return Components.Text;
};

module.exports = { assignComponent };
