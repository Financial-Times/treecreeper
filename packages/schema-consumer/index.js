const EventEmitter = require('events');
const fetch = require('node-fetch');
const deepFreeze = require('deep-freeze');
const { Cache } = require('../../packages/schema-utils/cache');
const readYaml = require('./read-yaml');
const { getSchemaFilename } = require('../../packages/schema-utils');
const { version: libVersion } = require('../../package.json');

class SchemaConsumer {
	constructor(options = {}) {
		this.eventEmitter = new EventEmitter();
		this.lastRefreshDate = 0;
		this.cache = new Cache();
		this.configure(options);
		// TODO improve this
		// currently when creating new instance defaults to dev, so always tries to fetch rawData from
		// yaml before the app gets a change to call configure to take out of dev mode
		// need to think of a way to delay this.
		// Mayeb configure should be called init() instead
		// Maybe a static method getDevInstance() woudl be useful for tests
		// but then tests don't use the same code as src... hmmm
		if (options.rawData) {
			this.rawData = options.rawData
		} else {
			try {
				this.rawData = deepFreeze({
					schema: {
						types: readYaml.directory('types'),
						typeHierarchy: readYaml.file('type-hierarchy.yaml'),
						stringPatterns: readYaml.file('string-patterns.yaml'),
						enums: readYaml.file('enums.yaml'),
					},
				});
			} catch (e) {
				console.log(e);
				this.rawData = {};
			}
		}
	}

	configure({
		updateMode = 'dev', // also 'stale' or 'poll'
		ttl = 60000,
		baseUrl,
		logger = console,
	} = {}) {
		this.updateMode = updateMode;
		this.ttl = ttl;
		this.baseUrl = baseUrl;
		this.logger = logger;
		this.url = `${this.baseUrl}/${getSchemaFilename(libVersion)}`;
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

	setRawData(data) {
		this.rawData = deepFreeze(data);
		this.cache.clear();
	}

	on(event, func) {
		return this.eventEmitter.on(event, func);
	}

	refresh() {
		if (this.updateMode === 'dev') {
			return Promise.resolve().then(() =>
				this.eventEmitter.emit('change', { oldVersion: false }),
			);
		}
		if (this.updateMode !== 'stale') {
			throw new Error('Cannot refresh when updateMode is not "stale"');
		}

		if (Date.now() - this.lastRefreshDate > this.ttl) {
			return this.fetch();
		}
		return Promise.resolve();
	}

	fetch() {
		this.lastRefreshDate = Date.now();
		this.logger.info({
			event: 'FETCHING_SCHEMA',
			url: this.url,
		});
		return fetch(this.url)
			.then(res => res.json())
			.then(data => {
				const oldVersion = this.getVersion();
				if (data.version === oldVersion) {
					this.logger.debug({ event: 'SCHEMA_NOT_CHANGED' });
					return;
				}
				this.setRawData(data);
				this.logger.info({
					event: 'SCHEMA_UPDATED',
					newVersion: data.version,
					oldVersion,
				});

				this.eventEmitter.emit('change', {
					newVersion: data.version,
					oldVersion,
				});
			})
			.catch(error =>
				this.logger.error({ event: 'SCHEMA_UPDATE_FAILED', error }),
			);
	}

	startPolling() {
		if (this.updateMode === 'dev') {
			return Promise.resolve().then(() =>
				this.eventEmitter.emit('change', { oldVersion: false }),
			);
		}
		if (this.updateMode !== 'poll') {
			throw new Error(
				'Cannot start polling when updateMode is not "poll"',
			);
		}
		if (this.firstFetch) {
			return this.firstFetch;
		}

		this.logger.info({
			event: 'STARTING_SCHEMA_POLLER',
		});
		this.timer = setInterval(() => this.fetch(), this.ttl).unref();
		this.firstFetch = this.fetch();
		return this.firstFetch;
	}

	stopPolling() {
		clearInterval(this.timer);
		delete this.firstFetch;
	}
}

module.exports = { SchemaConsumer, readYaml };
