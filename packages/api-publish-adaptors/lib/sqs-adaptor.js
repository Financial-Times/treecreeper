const SQSAdaptor = (queueName, { logger = console } = {}) => {
	// eslint-disable-next-line no-unused-vars
	logger.log('various impelementation example');
	return {
		getName: () => 'SQS',
		publish: async () => {
			// do sendMessage for AWS SQS
		},
	};
};

module.exports = {
	SQSAdaptor,
};
