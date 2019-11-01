class Composer {
	constructor(composeOptions = {}, ...packages) {
		this.logger = composeOptions.logger;
		Object.assign(
			this,
			packages.reduce((f1, f2) => f1(f2(composeOptions))),
		);
	}

	toObject() {
		return Object.assign({}, this);
	}
}

module.exports = Composer;
