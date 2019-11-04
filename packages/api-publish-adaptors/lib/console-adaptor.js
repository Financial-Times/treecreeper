const Adaptor = require('./adaptor');

class ConsoleAdaptor extends Adaptor {
	constructor() {
		super(console);
	}

	async publish(payload) {
		this.info(
			{
				event: 'CONSOLE_PUBLISH',
				payload,
			},
			`Console adaptor fired`,
		);
	}
}

module.exports = ConsoleAdaptor;
