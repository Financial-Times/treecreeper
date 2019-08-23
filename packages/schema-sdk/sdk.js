const deepFreeze = require('deep-freeze');
const { Cache } = require('../../packages/schema-utils/cache');
const { readYaml } = require('../../packages/schema-consumer');

class SDK {
	constructor() {
		this.cache = new Cache();
	}

	async init({ schemaDirectory, schemaUpdater }) {
		if (schemaDirectory) {
			this.rawData = deepFreeze({
				schema: {
					types: readYaml.directory(schemaDirectory, 'types'),
					typeHierarchy: readYaml.file(
						schemaDirectory,
						'type-hierarchy.yaml',
					),
					stringPatterns: readYaml.file(
						schemaDirectory,
						'string-patterns.yaml',
					),
					enums: readYaml.file(schemaDirectory, 'enums.yaml'),
				},
			});
		} else {
			// hook up schema updater to this.cache then
			schemaUpdater.on('change', data => {
				this.cache.clear();
				this.rawData = data;
			});
			this.updater = schemaUpdater;
			return schemaUpdater.ready();
		}
	}

	// Simplify cache keys to be concat args and stringified Obj.entries of options
	// don't worry about things using default optiosn not sharing same cache as those
	// explicitly passing it - really not that big a saving
}

class DataAccessors {
	constructor(schemaClient) {
		this.schemaClient = schemaClient;
		this.cache = new Cache();
		this.schemaClient.on('change', () => this.cache.clear());
		this.getType = this.cache.wrap(this.getType.bind(this));
	}

	getType(type, options = {}) {
		// checkCache(type, option1, option2...)
	}
}

module.exports = { SDK };
