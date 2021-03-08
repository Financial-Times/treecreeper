const deepFreeze = require('deep-freeze');

class RawDataWrapper {
	constructor() {
		this.rawData = {};
	}

	checkDataExists() {
		if (!this.rawData.schema) {
			throw new Error(`Schema data does not exist.
Check that you have configured tc-schema-sdk correctly (see https://github.com/Financial-Times/treecreeper/tree/master/packages/tc-schema-sdk)
and that you are using the correct refresh pattern for your environment
and have waited for the first fetch of schema data to happen.
Often this error occurs because a method of tc-schema-sdk is called once at the
top level of a module; try calling it from within the function that uses the data
instead.
`);
		}
	}

	getTypes() {
		this.checkDataExists();
		return this.rawData.schema.types;
	}

	getRelationshipTypes() {
		this.checkDataExists();
		return this.rawData.schema.relationshipTypes || [];
	}

	getTypeHierarchy() {
		this.checkDataExists();
		return this.rawData.schema.typeHierarchy;
	}

	getStringPatterns() {
		this.checkDataExists();
		return this.rawData.schema.stringPatterns;
	}

	getEnums() {
		this.checkDataExists();
		return this.rawData.schema.enums;
	}

	getPrimitiveTypes() {
		this.checkDataExists();
		return this.rawData.schema.primitiveTypes;
	}

	getVersion() {
		return this.rawData.version;
	}

	getAll() {
		this.checkDataExists();
		return this.rawData;
	}

	set(data) {
		this.rawData = deepFreeze(data);
		this.isHydrated = true;
	}
}

module.exports = { RawDataWrapper };
