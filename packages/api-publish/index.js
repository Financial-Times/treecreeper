const { createPublisher } = require('./lib/publisher');
const { logChanges } = require('./lib/log-changes');

module.exports = {
	createPublisher,
	logChanges,
};
