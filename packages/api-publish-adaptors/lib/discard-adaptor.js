const Adaptor = require('./adaptor');

class DiscardAdaptor extends Adaptor {
	constructor() {
		super(console);
	}

	async publish() {
		// noop
	}
}

module.exports = DiscardAdaptor;
