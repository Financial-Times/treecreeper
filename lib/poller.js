const fetch = require('node-fetch');
const EventEmitter = require('events');
const rawData = require('./raw-data');

const eventEmitter = new EventEmitter();

const fetchSchema = url =>
	fetch(url)
		.then(res => res.json())
		.then(data => {
			if (data.version === rawData.getVersion()) {
				return;
			}
			rawData.set(data);
			eventEmitter.emit('change');
		});

const start = url => {
	setInterval(fetchSchema, 20000, url);
	return fetchSchema(url);
};

module.exports = {
	start,
	onChange: func => eventEmitter.on('change', func),
};
