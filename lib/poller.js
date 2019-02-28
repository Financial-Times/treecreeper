const semver = require('semver');
const fetch = require('node-fetch');
const EventEmitter = require('events');
const rawData = require('./raw-data');
const { version: libVersion } = require('../package.json');

const majorVersion = semver.major(libVersion);
const isPrerelease = !!semver.prerelease(libVersion);

const schemaFileName = `v${majorVersion}${
	isPrerelease ? '-prerelease' : ''
}.json`;

const eventEmitter = new EventEmitter();

const fetchSchema = url =>
	fetch(url)
		.then(res => res.json())
		.then(data => {
			if (data.version === rawData.getVersion()) {
				return;
			}
			eventEmitter.emit('beforechange', data);
			rawData.set(data);
			eventEmitter.emit('change');
		});

const start = baseUrl => {
	const url = `${baseUrl}/${schemaFileName}`;
	setInterval(fetchSchema, 20000, url).unref();
	return fetchSchema(url);
};

module.exports = {
	start,
	on: (event, func) => eventEmitter.on(event, func),
};
