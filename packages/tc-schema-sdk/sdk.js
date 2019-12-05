const { Cache } = require('./lib/cache');
const { RawDataWrapper } = require('./lib/raw-data-wrapper');
const getValidators = require('./lib/validators');
const TreecreeperUserError = require('./lib/biz-ops-error');
const type = require('./data-accessors/type');
const graphqlDefs = require('./data-accessors/graphql-defs');
const stringValidator = require('./data-accessors/string-validator');
const enums = require('./data-accessors/enums');
const types = require('./data-accessors/types');
const relationshipTypes = require('./data-accessors/relationship-types');
const relationshipType = require('./data-accessors/relationship-type');
const { SchemaUpdater } = require('./lib/updater');
const utils = require('./lib/utils');

class SDK {
	constructor(options = {}) {
		this.cache = new Cache();
		this.rawData = new RawDataWrapper();
		this.TreecreeperUserError = TreecreeperUserError;
		this.subscribers = [];

		this.getEnums = this.createEnrichedAccessor(enums);
		this.getStringValidator = this.createEnrichedAccessor(stringValidator);
		this.getType = this.createEnrichedAccessor(type);
		this.getTypes = this.createEnrichedAccessor(types);
		this.getRelationshipType = this.createEnrichedAccessor(
			relationshipType,
		);
		this.getRelationshipTypes = this.createEnrichedAccessor(
			relationshipTypes,
		);
		this.getGraphqlDefs = graphqlDefs.accessor.bind(this);
		this.validators = getValidators(this);
		this.ready = this.ready.bind(this);
		this.onChange = this.onChange.bind(this);

		Object.entries(utils).forEach(([name, method]) => {
			this[name] = method.bind(this);
		});

		if (options.init !== false) {
			this.init(options);
		}
	}

	createEnrichedAccessor({ accessor, cacheKeyGenerator }) {
		return this.cache.addCacheToFunction(
			accessor.bind(this),
			cacheKeyGenerator,
		);
	}

	async init(options) {
		const schemaUpdater = new SchemaUpdater(
			options,
			this.rawData,
			this.cache,
		);

		// hook up schema updater to this.cache then
		schemaUpdater.on('change', data => {
			this.subscribers.forEach(handler => handler(data));
		});
		this.updater = schemaUpdater;
	}

	async ready() {
		return this.updater.ready();
	}

	async refresh() {
		return this.updater.refresh();
	}

	onChange(handler, event) {
		// handle the case where things are listening for an asynchronous
		// load event, but it has already happened
		if (this.rawData.isHydrated) {
			handler(event);
		}
		this.subscribers.push(handler);
	}
}

module.exports = { SDK };
