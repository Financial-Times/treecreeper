const propertyNameRegex = /^[a-z][a-zA-Z\d]+$/;
const { stripIndents } = require('common-tags');
const TreecreeperUserError = require('./biz-ops-error');

const throwInvalidValueError = (
	typeName,
	propertyName,
	propertyValue,
	aliasPropertyName,
) => reason => {
	const propName = aliasPropertyName || propertyName;
	throw new TreecreeperUserError(
		stripIndents`Invalid value \`${propertyValue}\` for property \`${propName}\` on type \`${typeName}\`: ${reason}`,
	);
};

const validateBoolean = (type, value, exit) => {
	if (type === 'Boolean') {
		if (typeof value !== 'boolean') {
			exit('Must be a Boolean');
		}
	}
};

const validateFloat = (type, value, exit) => {
	if (type === 'Float') {
		if (!Number.isFinite(value)) {
			exit('Must be a finite floating point number');
		}
	}
};

const validateInt = (type, value, exit) => {
	if (type === 'Int') {
		if (!Number.isFinite(value) || Math.round(value) !== value) {
			exit('Must be a finite integer');
		}
	}
};

const validateString = (type, value, exit, validator) => {
	if (type === 'String') {
		if (typeof value !== 'string') {
			exit('Must be a string');
		}

		if (validator && !validator.test(value)) {
			const maxlength = validator.toString().match(/\.\{\d+,(\d+)\}\$/);
			if (maxlength) {
				exit(
					`Must match pattern ${validator} and be no more than ${maxlength[1]} characters`,
				);
			}
			exit(`Must match pattern ${validator}`);
		}
	}
};

const validateEnums = (type, value, exit, getEnums) => {
	if (type in getEnums()) {
		const validVals = Object.values(getEnums()[type]);
		if (!validVals.includes(value)) {
			exit(`Must be a valid enum: ${validVals.join(', ')}`);
		}
	}
};

// relationship value could be just a String(code), an Object or an Array of strings(codes) / objects(code and properties) / mixed
// this function is to normalise them into an Array of objects
const normaliseRelationshipProps = relValues => {
	if (relValues !== null) {
		if (typeof relValues === 'string') {
			return [{ code: relValues }];
		}
		if (Array.isArray(relValues)) {
			const normalisedRelValues = [];
			relValues.forEach(relValue =>
				typeof relValue === 'string'
					? normalisedRelValues.push({ code: relValue })
					: normalisedRelValues.push(relValue),
			);
			return normalisedRelValues;
		}
		// when value is an object
		return [relValues];
	}
};

const validateTypeName = getType => type => getType(type);

const validateNodeCode = ({ getType, type, propValue, primitiveTypesMap }) => {
	const { validator } = getType(type).properties.code;
	const exit = throwInvalidValueError(type, 'code', propValue);
	validateString(primitiveTypesMap.Code, propValue, exit, validator);
};

const validateRelationshipProps = ({
	getRelationshipType,
	getEnums,
	typeName,
	propertyName,
	relPropName,
	relPropValue,
	primitiveTypesMap,
}) => {
	const {
		name: relType,
		properties: relPropsDef,
		validator: relValidator,
	} = getRelationshipType(typeName, propertyName);

	if (!relType) {
		throw new TreecreeperUserError(
			`\`${propertyName}\` does not accept relationship properties.`,
		);
	}

	const relPropDef = relPropsDef[relPropName];
	if (!relPropDef) {
		throw new TreecreeperUserError(
			`Invalid property \`${relPropName}\` on type \`${relType}\`.`,
		);
	}

	const relPropType = primitiveTypesMap[relPropDef.type] || relPropDef.type;
	const exit = throwInvalidValueError(relType, relPropName, relPropValue);

	validateBoolean(relPropType, relPropValue, exit);
	validateFloat(relPropType, relPropValue, exit);
	validateInt(relPropType, relPropValue, exit);
	validateString(relPropType, relPropValue, exit, relValidator);
	validateEnums(relPropType, relPropValue, exit, getEnums);
};

const validateProperty = ({
	getType,
	getEnums,
	getPrimitiveTypes,
	getRelationshipType,
}) => {
	const propertyValidator = (
		typeName,
		propertyName,
		propertyValue,
		aliasPropertyName,
	) => {
		if (propertyValue === null) {
			return;
		}

		const propertyDefinition = getType(typeName).properties[propertyName];
		if (!propertyDefinition) {
			throw new TreecreeperUserError(
				`Invalid property \`${propertyName}\` on type \`${typeName}\`.`,
			);
		}

		const {
			validator,
			isRelationship,
			hasMany,
			cypher,
		} = propertyDefinition;

		const primitiveTypesMap = getPrimitiveTypes();

		const type =
			primitiveTypesMap[propertyDefinition.type] ||
			propertyDefinition.type;

		const exit = throwInvalidValueError(
			typeName,
			propertyName,
			propertyValue,
			aliasPropertyName,
		);

		if (isRelationship) {
			if (cypher) {
				exit(
					`Cannot write relationship \`${propertyName}\` - it is defined using a custom, read-only query`,
				);
			}
			const relPropsList = normaliseRelationshipProps(propertyValue);
			if (!hasMany && relPropsList.length > 1) {
				exit(`Can only have one ${propertyName}`);
			}

			// eslint-disable-next-line array-callback-return
			relPropsList.map(relProps => {
				Object.entries(relProps).forEach(
					([relPropName, relPropValue]) => {
						if (relPropValue === null) {
							return;
						}
						if (relPropName === 'code') {
							validateNodeCode({
								getType,
								type,
								propValue: relPropValue,
								primitiveTypesMap,
							});
						} else {
							validateRelationshipProps({
								getRelationshipType,
								getEnums,
								typeName,
								propertyName,
								relPropName,
								relPropValue,
								primitiveTypesMap,
							});
						}
					},
				);
			});
		}

		validateBoolean(type, propertyValue, exit);
		validateFloat(type, propertyValue, exit);
		validateInt(type, propertyValue, exit);
		validateString(type, propertyValue, exit, validator);
		validateEnums(type, propertyValue, exit, getEnums);
	};

	return propertyValidator;
};

const validatePropertyName = name => {
	// FIXME: allow SF_ID as, at least for a while, we need this to exist so that
	// salesforce sync works during the transition to the new architecture
	if (name !== 'SF_ID' && !propertyNameRegex.test(name)) {
		throw new TreecreeperUserError(
			`Invalid property name \`${name}\`. Must be a camelCase string, i.e.
			beginning with a lower case letter, and only containing upper and lower case letters
			and digits`,
		);
	}
};

module.exports = ({
	getEnums,
	getType,
	getPrimitiveTypes,
	getRelationshipType,
}) => {
	const propertyValidator = validateProperty({
		getEnums,
		getType,
		getPrimitiveTypes,
		getRelationshipType,
	});
	return {
		validateTypeName: validateTypeName(getType),
		validateProperty: propertyValidator,
		validatePropertyName,
		validateCode: (type, code, aliasName = 'code') =>
			propertyValidator(type, 'code', code, aliasName),
	};
};
