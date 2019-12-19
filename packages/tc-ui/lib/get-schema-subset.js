const { getType } = require('@financial-times/tc-schema-sdk');

const getTypeOptions = {
	groupProperties: true,
	includeMetaFields: false,
};

const getSchemaSubset = (event, type, isCreate = false) => {
	const properties = event.query && event.query.properties;

	if (!properties) {
		return {
			schema: getType(type, {
				...getTypeOptions,
				useMinimumViableRecord: isCreate,
			}),
			isSubset: false,
		};
	}

	const title = event.query && event.query.title;
	const fullSchema = getType(type, getTypeOptions);
	const propertyKeys = properties.split(',');

	return {
		schema: {
			...fullSchema,
			fieldsets: {
				[title]: {
					heading: title || 'Properties',
					properties: Object.entries(fullSchema.properties)
						.filter(([propName]) => propertyKeys.includes(propName))
						.reduce(
							(fieldset, [propName, propDef]) => ({
								...fieldset,
								[propName]: propDef,
							}),
							{},
						),
				},
			},
		},
		isSubset: true,
	};
};

module.exports = { getSchemaSubset };
