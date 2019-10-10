const { getType } = require('../../packages/schema-sdk');

const isNullValue = val => val === null || val === '';

const entriesToObject = (map, [key, val]) => Object.assign(map, { [key]: val });

const detectPropertyChanges = (nodeType, initialContent = {}) => {
	if (!Object.keys(initialContent).length) {
		return ([, val]) => !isNullValue(val);
	}

	const { properties } = getType(nodeType);

	return ([propName, val]) => {
		if (!(propName in initialContent)) {
			return !isNullValue(val);
		}

		if (isNullValue(val)) {
			return true;
		}

		return val !== initialContent[propName];
	};
};

const diffProperties = ({ nodeType, newContent = {}, initialContent = {} }) =>
	Object.entries(newContent)
		.filter(detectPropertyChanges(nodeType, initialContent))
		.reduce(entriesToObject, {});

module.exports = {
	diffProperties,
};
