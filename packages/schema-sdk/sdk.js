const { Cache } = require('../../packages/schema-utils/cache');
const { readYaml } = require('../../packages/schema-consumer');
const { RawDataWrapper } = require('./raw-data-wrapper');
const getDataAccessors = require('./data-accessors');
const getValidators = require('./validators');
const BizOpsError = require('./biz-ops-error');

class SDK {
	constructor() {
		this.cache = new Cache();
		this.rawData = new RawDataWrapper();
		Object.assign(this, getDataAccessors(this.rawData, this.cache));
		this.validators = getValidators(this);
		this.BizOpsError = BizOpsError;
		this.subscribers = [];
	}

	async init({ schemaDirectory, schemaUpdater }) {
		if (schemaDirectory) {
			const schemaData = {
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
			};
			this.rawData.set();
			// firing a one off change event
			this.subscribers.forEach(handler => {
				handler(schemaData);
			});
		} else {
			// hook up schema updater to this.cache then
			schemaUpdater.on('change', data => {
				this.rawData.set(data);
				this.cache.clear();
				this.subscribers.forEach(handler => handler(data));
			});
			this.updater = schemaUpdater;
			// TODO universal init method that does first fetch
			return this.updater.ready();
		}
	}

	async ready() {
		return this.updater ? this.updater.ready() : true;
	}

	// TODO ditch this in favour of using OnChange everywhere
	on(event, handler) {
		if (event === 'change') {
			return this.onChange(handler);
		}
	}

	onChange(handler) {
		// handle the cas ewhere thinsg are listening for an asynchronous
		// load event, but it has already happened
		if (this.rawData.isHydrated) {
			handler();
		}
		this.subscribers.push(handler);
	}
}

// Simplify cache keys to be concat args and stringified Obj.entries of options
// don't worry about things using default optiosn not sharing same cache as those
// explicitly passing it - really not that big a saving
// class DataAccessors {
// 	constructor(schemaClient) {
// 		this.schemaClient = schemaClient;
// 		this.cache = new Cache();
// 		this.schemaClient.on('change', () => this.cache.clear());
// 		this.getType = this.cache.wrap(this.getType.bind(this));
// 	}

// 	getType(type, options = {}) {
// 		// checkCache(type, option1, option2...)
// 	}
// }

module.exports = { SDK };
