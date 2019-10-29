const { KinesisAdaptor } = require('./lib/kinesis-adaptor');
const { SQSAdaptor } = require('./lib/sqs-adaptor');

module.exports = {
	KinesisAdaptor,
	SQSAdaptor,
};
