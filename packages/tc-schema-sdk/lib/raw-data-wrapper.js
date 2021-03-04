const deepFreeze = require('deep-freeze');

class RawDataWrapper {
	constructor(options = {}) {
		this.includeTestDefinitions = options.includeTestDefinitions;
		this.rawData = {};
	}

	filterTestProperties(obj = {}) {
		if (this.includeTestDefinitions) {
			return obj;
		}
		return Object.fromEntries(
			Object.entries(obj).filter(([, { isTest }]) => !isTest),
		);
	}

	filterTestItems(arr = []) {
		if (this.includeTestDefinitions) {
			return arr;
		}
		return arr.filter(({ isTest }) => !isTest);
	}

	filterTestTypes(arr = []) {
		if (this.includeTestDefinitions) {
			return arr;
		}
		return this.filterTestItems(arr).map(obj => ({
			...obj,
			properties: this.filterTestProperties(obj.properties),
		}));
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
		return this.filterTestTypes(this.rawData.schema.types);
	}

	getRelationshipTypes() {
		this.checkDataExists();
		return this.filterTestTypes(this.rawData.schema.relationshipTypes);
	}

	getTypeHierarchy() {
		this.checkDataExists();
		if (!this.rawData.schema.typeHierarchy) {
			return;
		}
		if (this.includeTestDefinitions) {
			return this.rawData.schema.typeHierarchy;
		}
		const typeNames = this.filterTestItems(this.rawData.schema.types).map(
			type => type.name,
		);
		return Object.fromEntries(
			Object.entries(this.rawData.schema.typeHierarchy || {}).map(
				([name, category]) => [
					name,
					{
						...category,
						types: category.types.filter(type =>
							typeNames.includes(type),
						),
					},
				],
			),
		);
	}

	getStringPatterns() {
		this.checkDataExists();
		return this.rawData.schema.stringPatterns;
	}

	getEnums() {
		this.checkDataExists();
		// TODO - allow test enum values
		return this.filterTestProperties(this.rawData.schema.enums);
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
		return {
			schema: {
				types: this.getTypes(),
				relationshipTypes: this.getRelationshipTypes(),
				stringPatterns: this.getStringPatterns(),
				enums: this.getEnums(),
				primitiveTypes: this.getPrimitiveTypes(),
				typeHierarchy: this.getTypeHierarchy(),
			},
			version: this.getVersion(),
		};
	}

	set(data) {
		this.rawData = deepFreeze(data);
		this.isHydrated = true;
	}
}

module.exports = { RawDataWrapper };
