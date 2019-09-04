const clone = require('clone');
const primitiveTypesMap = require('../primitive-types-map');
const metaProperties = require('../meta-properties');
const BizOpsError = require('../biz-ops-error');

const BIZ_OPS = 'biz-ops';

const entriesArrayToObject = arr =>
	arr.reduce((obj, [name, val]) => Object.assign(obj, { [name]: val }), {});

const hydrateFieldsets = ({
	properties,
	fieldsets = {},
	includeMetaFields,
	useMinimumViableRecord,
	minimumViableRecord = [],
}) => {
	const fieldsetEntries = Object.entries(fieldsets);

	const hasRealFieldsets = !!fieldsetEntries.length;

	fieldsetEntries.push([
		'misc',
		{
			heading: hasRealFieldsets ? 'Miscellaneous' : 'General',
		},
	]);

	if (useMinimumViableRecord && minimumViableRecord.length) {
		fieldsetEntries.unshift([
			'minimumViableRecord',
			{ heading: 'Minimum viable record' },
		]);
	}

	if (includeMetaFields) {
		fieldsetEntries.push(['meta', { heading: 'Metadata' }]);
	}

	const insertIntoFieldset = (fieldsetName = 'misc', prop, def) => {
		const [, targetFieldset] = fieldsetEntries.find(
			([name]) => name === fieldsetName,
		);

		targetFieldset.properties = targetFieldset.properties || [];
		targetFieldset.properties.push([prop, def]);
	};

	properties.forEach(([prop, def]) => {
		const { fieldset } = def;

		if (useMinimumViableRecord && minimumViableRecord.includes(prop)) {
			insertIntoFieldset('minimumViableRecord', prop, def);
		} else if (fieldset === 'self') {
			fieldsetEntries.push([
				prop,
				{
					heading: def.label,
					description: def.description,
					isSingleField: true,
					properties: [[prop, def]],
				},
			]);
		} else {
			insertIntoFieldset(fieldset, prop, def);
		}
	});

	return entriesArrayToObject(
		fieldsetEntries
			.filter(([, { properties: props }]) => props && props.length)
			.map(([prop, def]) => {
				def.properties = entriesArrayToObject(def.properties);
				return [prop, def];
			}),
	);
};

const getFromRawData = (typeName, rawData) => {
	const typeDefinition = rawData
		.getTypes()
		.find(type => type.name === typeName);

	if (!typeDefinition) {
		throw new BizOpsError(`Invalid type \`${typeName}\``);
	}

	return clone(typeDefinition);
};

const cacheKeyGenerator = (
	typeName,
	{
		primitiveTypes = BIZ_OPS,
		withRelationships = true,
		groupProperties = false,
		includeMetaFields = false,
		useMinimumViableRecord = false,
	} = {},
) =>
	`types:${typeName}:${withRelationships}:${groupProperties}:${includeMetaFields}:${primitiveTypes}:${useMinimumViableRecord}`;

const getType = function(
	typeName,
	{
		primitiveTypes = BIZ_OPS, // graphql
		withRelationships = true,
		groupProperties = false,
		includeMetaFields = false,
		useMinimumViableRecord = false,
	} = {},
) {
	const typeSchema = getFromRawData(typeName, this.rawData);

	typeSchema.type = typeSchema.name;

	if (!('properties' in typeSchema)) {
		typeSchema.properties = {};
	}

	if (!typeSchema.pluralName) {
		typeSchema.pluralName = `${typeSchema.name}s`;
	}

	if (typeSchema.properties.code) {
		Object.assign(typeSchema.properties.code, {
			type: 'Code',
			required: true,
			unique: true,
			canIdentify: true,
			useInSummary: true,
		});
	}

	if (withRelationships) {
		Object.entries(typeSchema.properties).forEach(([propName, def]) => {
			if (def.relationship) {
				if (def.hidden) {
					delete typeSchema.properties[propName];
				}
				Object.assign(def, {
					hasMany: def.hasMany || false,
					isRelationship: !!def.relationship,
					isRecursive: def.isRecursive || false,
					writeInactive:
						'writeInactive' in def ? def.writeInactive : false,
					showInactive:
						'showInactive' in def ? def.showInactive : true,
				});
			}
		});
	} else {
		Object.entries(typeSchema.properties).forEach(([propName, def]) => {
			if (def.relationship) {
				delete typeSchema.properties[propName];
			}
		});
	}
	if (includeMetaFields) {
		metaProperties.forEach(metaProperty => {
			typeSchema.properties[metaProperty.name] = metaProperty;
		});
	}
	const properties = Object.entries(typeSchema.properties)
		.map(([name, def]) => {
			if (primitiveTypes === 'graphql') {
				// If not a primitive type we assume it's an enum and leave it unaltered
				def.type = primitiveTypesMap[def.type] || def.type;
			}
			if (def.pattern) {
				def.validator = this.getStringValidator(def.pattern);
			}
			return [name, def];
		})
		.filter(entry => !!entry);

	if (groupProperties) {
		typeSchema.fieldsets = hydrateFieldsets({
			properties,
			fieldsets: typeSchema.fieldsets,
			includeMetaFields,
			useMinimumViableRecord,
			minimumViableRecord: typeSchema.minimumViableRecord,
		});
		delete typeSchema.properties;
	} else {
		typeSchema.properties = entriesArrayToObject(properties);
	}
	return typeSchema;
};

module.exports = {
	accessor: getType,
	cacheKeyGenerator,
};
