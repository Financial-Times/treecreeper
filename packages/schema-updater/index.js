const EventEmitter = require('events');
const fetch = require('node-fetch');
const readYaml = require('./read-yaml');
const { getSchemaFilename } = require('../../packages/schema-utils');
const { version: libVersion } = require('../../package.json');

class SchemaUpdater {
	constructor(options = {}) {
		this.eventEmitter = new EventEmitter();
		this.lastRefreshDate = 0;
		this.configure(options);
	}

	configure({
		updateMode = 'dev', // also 'stale' or 'poll'
		ttl = 60000,
		baseUrl,
		logger = console,
		version,
	} = {}) {
		this.updateMode = updateMode;
		this.ttl = ttl;
		this.baseUrl = baseUrl;
		this.logger = logger;
		this.version = version;
		this.url = `${this.baseUrl}/${getSchemaFilename(libVersion)}`;
	}

	on(event, func) {
		return this.eventEmitter.on(event, func);
	}

	getVersion() {
		return this.version;
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
			.then(schemaData => {
				const oldVersion = this.getVersion();
				if (schemaData.version === oldVersion) {
					this.logger.debug({ event: 'SCHEMA_NOT_CHANGED' });
					return;
				}
				this.version = schemaData.version;
				this.logger.info({
					event: 'SCHEMA_UPDATED',
					newVersion: schemaData.version,
					oldVersion,
				});
				this.eventEmitter.emit('change', {
					newVersion: schemaData.version,
					oldVersion,
					schemaData,
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

module.exports = { SchemaUpdater, readYaml };
