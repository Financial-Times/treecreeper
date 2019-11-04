class Composer {
	constructor(composeOptions = {}, ...packages) {
		this.logger = composeOptions.logger;
		const composed = packages.reduce((left, right) => options =>
			left(right(options)),
		);
		Object.assign(this, composed(composeOptions));
	}

	toObject() {
		return Object.assign({}, this);
	}
}

module.exports = Composer;
