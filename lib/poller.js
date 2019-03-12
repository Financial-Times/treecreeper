const fetch = require('node-fetch');
const EventEmitter = require('events');
const rawData = require('./raw-data');
const getSchemaFilename = require('./get-schema-filename');
const { version: libVersion } = require('../package.json');

const schemaFileName = getSchemaFilename(libVersion);

const eventEmitter = new EventEmitter();

let logger = console;

const fetchSchema = url =>
	fetch(url)
		.then(res => res.json())
		.then(data => {
			const oldVersion = rawData.getVersion();
			if (data.version === oldVersion) {
				logger.debug({ event: 'SCHEMA_NOT_CHANGED' });
				return;
			}
			rawData.set(data);
			logger.info({
				event: 'SCHEMA_UPDATED',
				newVersion: data.version,
				oldVersion,
			});
			eventEmitter.emit('change');
		})
		.catch(error => logger.error({ event: 'SCHEMA_UPDATE_FAILED', error }));

let timer;

const start = (baseUrl, interval = 20000) => {
	const url = `${baseUrl}/${schemaFileName}`;
	timer = setInterval(fetchSchema, interval, url).unref();
	return fetchSchema(url);
};

module.exports = {
	setLogger: customLogger => {
		logger = customLogger;
	},
	start,
	stop: () => clearInterval(timer),
	on: (event, func) => eventEmitter.on(event, func),
	schemaFileName,
};
