const deepFreeze = require('deep-freeze');

class RawDataWrapper {
	constructor() {
		this.rawData = {};
	}

	checkDataExists() {
		if (!this.rawData.schema) {
			throw new Error(`Schema data does not exist.
Check that you have configured biz-ops-schema correctly (see the README)
and that you are using the correct refresh pattern for your environment
and have waited for the first fetch of schema data to happen.

If npm linking the schema locally, set \`updateMode: 'dev'\`
`);
		}
	}

	getTypes() {
		this.checkDataExists();
		return this.rawData.schema.types;
	}

	getRelationships() {
		this.checkDataExists();
		return this.rawData.schema.relationships;
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
