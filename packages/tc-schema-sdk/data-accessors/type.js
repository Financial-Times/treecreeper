const clone = require('clone');
const TreecreeperUserError = require('../lib/biz-ops-error');
const {
	assignMetaProperties,
	transformPrimitiveTypes,
} = require('../lib/property-assign');

const entriesArrayToObject = arr =>
	arr.reduce((obj, [name, val]) => Object.assign(obj, { [name]: val }), {});

const isUserDefinedRelationship = propDef =>
	['relationship', 'cypher'].some(name => name in propDef);

const isRichRelationship = (richRelationshipTypes, propDef) =>
	richRelationshipTypes.some(relType => relType.name === propDef.type);

const isRelationship = (richRelationshipTypes, propDef) =>
	isUserDefinedRelationship(propDef) ||
	isRichRelationship(richRelationshipTypes, propDef);

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

	Object.entries(properties)
		.filter(([, { isTest }]) => !isTest || this.includeTestDefinitions)
		.forEach(([prop, def]) => {
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
		throw new TreecreeperUserError(`Invalid type \`${typeName}\``);
	}

	return clone(typeDefinition);
};

const findDirection = (rootType, propDef, relationshipType) =>
	propDef.direction ||
	(relationshipType.from.type === rootType ? 'outgoing' : 'incoming');

const findEndType = (direction, relationshipType) =>
	direction === 'outgoing'
		? relationshipType.to.type
		: relationshipType.from.type;

const findCardinality = (direction, relationshipType) =>
	direction === 'outgoing'
		? relationshipType.to.hasMany
		: relationshipType.from.hasMany;

const createPropertiesWithRelationships = function ({
	richRelationshipTypes,
	properties,
	relationshipGetter,
	typeName,
	withRelationships,
}) {
	return Object.entries(properties).reduce(
		(updatedProps, [propName, propDef]) => {
			if (propDef.hidden) {
				return updatedProps;
			}
			const propIsRelationship = isRelationship(
				richRelationshipTypes,
				propDef,
			);
			if (propIsRelationship && !withRelationships) {
				return updatedProps;
			}
			const relationshipType = propIsRelationship
				? relationshipGetter(propName)
				: null;

			if (!propIsRelationship || !relationshipType) {
				return {
					...updatedProps,
					[propName]: {
						...propDef,
						isRelationship: !!propDef.cypher,
						hasMany: !!propDef.hasMany,
					},
				};
			}

			const direction = findDirection(
				typeName,
				propDef,
				relationshipType,
			);

			return {
				...updatedProps,
				[propName]: {
					...propDef,
					direction,
					type: findEndType(direction, relationshipType),
					relationship: relationshipType.relationship,
					hasMany: findCardinality(direction, relationshipType),
					isRelationship: true,
					writeInactive:
						'writeInactive' in propDef
							? propDef.writeInactive
							: false,
					showInactive:
						'showInactive' in propDef ? propDef.showInactive : true,
					properties: relationshipType.properties,
				},
			};
		},
		{},
	);
};

const removeSyntheticProperties = properties => {
	Object.entries(properties).forEach(([name, { cypher }]) => {
		if (cypher) {
			delete properties[name];
		}
	});
};

const cacheKeyGenerator = (
	typeName,
	{
		withRelationships = true,
		groupProperties = false,
		includeMetaFields = false,
		includeSyntheticFields = true,
		useMinimumViableRecord = false,
	} = {},
) =>
	`types:${typeName}:${withRelationships}:${groupProperties}:${includeMetaFields}:${includeSyntheticFields}:${useMinimumViableRecord}`;

const getType = function (
	typeName,
	{
		withRelationships = true,
		groupProperties = false,
		includeMetaFields = false,
		includeSyntheticFields = true,
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

	let properties = { ...typeSchema.properties };

	if (!includeSyntheticFields) {
		removeSyntheticProperties(properties);
	}

	const richRelationshipTypes = this.rawData.getRelationshipTypes();

	const relationshipGetter = propName =>
		this.getRelationshipType(
			typeSchema.name,
			propName,
			richRelationshipTypes,
			{
				includeMetaFields,
			},
		);

	properties = createPropertiesWithRelationships({
		richRelationshipTypes,
		properties,
		relationshipGetter,
		typeName,
		withRelationships,
	});

	if (includeMetaFields) {
		properties = assignMetaProperties(properties);
	}

	properties = transformPrimitiveTypes(properties, this.getStringValidator);

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
		typeSchema.properties = properties;
	}
	return typeSchema;
};

module.exports = {
	accessor: getType,
	cacheKeyGenerator,
};
