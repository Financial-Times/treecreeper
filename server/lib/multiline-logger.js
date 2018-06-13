const logger = require('@financial-times/n-logger').default;

const multiline = args => {
	return args.map(arg => {
		if (typeof arg === 'object') {
			return Object.assign(
				{},
				arg,
				Object.entries(arg)
					.filter(([, value]) => /\n/.test(value))
					.reduce(
						(map, [key, value]) =>
							Object.assign(map, {
								[key]: value.replace(/\n/g, '\\n')
							}),
						{}
					)
			);
		}
		return arg;
	});
};

module.exports = {
	info: (...args) => logger.info(...multiline(args)),
	warn: (...args) => logger.warn(...multiline(args)),
	error: (...args) => logger.error(...multiline(args))
};
