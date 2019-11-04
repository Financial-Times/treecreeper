// Adaptor base class -- this class has abilities for logging
class Adaptor {
	constructor(logger) {
		this.logger = logger;
		this._pluckFields = [];

		// expose logger methods to this object
		// then user can call adaptor.info(), which is passed to logger.info()
		['info', 'warn', 'log', 'error', 'debug'].forEach(method => {
			this[method] = (...msg) => logger[method](...msg);
		});
	}

	// eslint-disable-next-line no-unused-vars
	async publish(payload) {
		throw new Error('publish method must be overried in sub-class.');
	}

	pluckFields() {
		return this._pluckFields;
	}
}

module.exports = Adaptor;
