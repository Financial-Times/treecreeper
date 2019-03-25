const EventEmitter = require('events');
const fetch = require('node-fetch');
const deepFreeze = require('deep-freeze');
const Cache = require('./cache');
const readYaml = require('./read-yaml');
const getSchemaFilename = require('./get-schema-filename');
const { version: libVersion } = require('../package.json');

class RawData {
	constructor({
		updateMode = 'poll', // also 'stale'
		ttl = 20000,
		baseUrl,
		logger = console,
	} = {}) {
		this.rawData = deepFreeze({
			schema: {
				types: readYaml.directory('types'),
				stringPatterns: readYaml.file('string-patterns.yaml'),
				enums: readYaml.file('enums.yaml'),
			},
		});

		this.eventEmitter = new EventEmitter();

		this.updateMode = updateMode;
		this.ttl = ttl;
		this.baseUrl = baseUrl;
		this.logger = logger;

		this.url = `${this.baseUrl}/${getSchemaFilename(libVersion)}`;

		this.lastRefreshDate = 0;
		this.cache = new Cache();
	}

	getTypes() {
		return this.rawData.schema.types;
	}

	getStringPatterns() {
		return this.rawData.schema.stringPatterns;
	}

	getEnums() {
		return this.rawData.schema.enums;
	}

	getVersion() {
		return this.rawData.version;
	}

	getAll() {
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

				this.eventEmitter.emit('change');
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
		this.logger.info({
			event: 'STARTING_SCHEMA_POLLER',
		});
		this.timer = setInterval(() => this.fetch(), this.ttl).unref();
		return this.fetch();
	}

	stopPolling() {
		clearInterval(this.timer);
	}
}

module.exports = RawData;
