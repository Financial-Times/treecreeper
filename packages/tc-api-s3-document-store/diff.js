const isNullValue = val => val === null || val === '';

const entriesToObject = (map, [key, val]) => Object.assign(map, { [key]: val });

const detectPropertyChanges = (initialContent = {}) => {
	if (!Object.keys(initialContent).length) {
		return ([, val]) => !isNullValue(val);
	}

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

const diffProperties = (newContent = {}, initialContent = {}) =>
	Object.entries(newContent)
		.filter(detectPropertyChanges(initialContent))
		.reduce(entriesToObject, {});

module.exports = {
	diffProperties,
};
