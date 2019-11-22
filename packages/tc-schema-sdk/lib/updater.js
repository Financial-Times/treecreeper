const EventEmitter = require('events');
const fetch = require('node-fetch');
const { getSchemaFilename } = require('@financial-times/tc-schema-file-name');
const readYaml = require('./read-yaml');

class SchemaUpdater {
	constructor(options, rawData, cache) {
		this.eventEmitter = new EventEmitter();
		this.lastRefreshDate = 0;
		this.rawData = rawData;
		this.cache = cache;
		this.configure(options);
	}

	configure({
		updateMode,
		ttl = 60000,
		logger = console,
		version,
		schemaBaseUrl = process.env.TREECREEPER_SCHEMA_URL,
		schemaDirectory = process.env.TREECREEPER_SCHEMA_DIRECTORY,
		schemaData,
	} = {}) {
		this.updateMode = updateMode;
		this.ttl = ttl;
		this.logger = logger;
		this.version = version;
		if (schemaDirectory && !schemaData) {
			schemaData = {
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
		}
		if (schemaData) {
			this.isStatic = true;
			this.rawData.set(schemaData);
			this.eventEmitter.emit('change', {
				oldVersion: undefined,
				newVersion: this.version,
			});
			this.version = schemaData.version;
			return;
		}

		this.url = `${schemaBaseUrl}/${getSchemaFilename()}`;
	}

	on(event, func) {
		return this.eventEmitter.on(event, func);
	}

	getVersion() {
		return this.version;
	}

	refresh() {
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
			.then(schemaData => {
				const oldVersion = this.getVersion();
				if (schemaData.version === oldVersion) {
					this.logger.debug({ event: 'SCHEMA_NOT_CHANGED' });
					return;
				}
				this.version = schemaData.version;

				this.rawData.set(schemaData);
				this.cache.clear();

				this.logger.info({
					event: 'SCHEMA_UPDATED',
					newVersion: schemaData.version,
					oldVersion,
				});
				this.eventEmitter.emit('change', {
					newVersion: schemaData.version,
					oldVersion,
				});
			})
			.catch(error =>
				this.logger.error({ event: 'SCHEMA_UPDATE_FAILED', error }),
			);
	}

	startPolling() {
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

	ready() {
		if (this.isStatic) {
			return Promise.resolve();
		}
		return this.updateMode === 'poll'
			? this.startPolling()
			: this.refresh();
	}
}

module.exports = { SchemaUpdater, readYaml };
